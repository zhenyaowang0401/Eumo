-- Apply after dig_sync.sql. Four digits identify a short-lived request, NOT a credential.
create table if not exists public.eumo_dig_pairs (
 writer_hash text primary key references public.eumo_dig_streams(writer_hash) on delete cascade,
 code_hash text unique, expires_at timestamptz not null,
 request_hash text unique, request_label text, confirmed boolean not null default false
);
create table if not exists public.eumo_dig_readers (
 reader_hash text primary key check(reader_hash ~ '^[a-f0-9]{64}$'),
 writer_hash text not null references public.eumo_dig_streams(writer_hash) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.eumo_dig_pair_limits (
 key text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.eumo_dig_pairs enable row level security;
alter table public.eumo_dig_readers enable row level security;
alter table public.eumo_dig_pair_limits enable row level security;
revoke all on public.eumo_dig_pairs,public.eumo_dig_readers,public.eumo_dig_pair_limits from public,anon,authenticated;
grant select,insert,update,delete on public.eumo_dig_pairs,public.eumo_dig_readers,public.eumo_dig_pair_limits to service_role;

create or replace function public.eumo_pair_dig(p_actor text,p_action text,p_code text,p_request text,p_label text,p_rate text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r eumo_dig_pairs%rowtype; n integer; target text; t timestamptz:=clock_timestamp();
begin
 if p_actor !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','INVALID_TOKEN'); end if;
 -- Database-backed limits work across serverless instances. Invalid guesses count too.
 if p_action in ('start','claim') then
  insert into eumo_dig_pair_limits values(p_action||':'||p_rate,t,1)
  on conflict(key) do update set attempts=case when eumo_dig_pair_limits.window_start<t-interval '1 minute' then 1 else eumo_dig_pair_limits.attempts+1 end,
    window_start=case when eumo_dig_pair_limits.window_start<t-interval '1 minute' then t else eumo_dig_pair_limits.window_start end
  returning attempts into n;
  if n>5 then return jsonb_build_object('error','RATE_LIMITED'); end if;
  delete from eumo_dig_pair_limits where window_start<t-interval '1 day';
 end if;
 if p_action='start' then
  if not exists(select 1 from eumo_dig_streams where writer_hash=p_actor) then return jsonb_build_object('error','PUBLISH_FIRST'); end if;
  delete from eumo_dig_pairs where expires_at<=t;
  if exists(select 1 from eumo_dig_pairs where code_hash=p_code and writer_hash<>p_actor) then return jsonb_build_object('error','CODE_BUSY'); end if;
  begin
   insert into eumo_dig_pairs(writer_hash,code_hash,expires_at) values(p_actor,p_code,t+interval '5 minutes')
   on conflict(writer_hash) do update set code_hash=excluded.code_hash,expires_at=excluded.expires_at,request_hash=null,request_label=null,confirmed=false;
  exception when unique_violation then return jsonb_build_object('error','CODE_BUSY'); end;
  return jsonb_build_object('expiresAt',t+interval '5 minutes');
 elsif p_action='claim' then
  -- A token already bound to another device must not overwrite that binding.
  if exists(select 1 from eumo_dig_readers where reader_hash=p_actor) then return jsonb_build_object('error','TOKEN_ALREADY_BOUND'); end if;
  select * into r from eumo_dig_pairs where code_hash=p_code and expires_at>t and not confirmed for update;
  if not found then return jsonb_build_object('error','INVALID_OR_EXPIRED_CODE'); end if;
  if r.request_hash is not null and r.request_hash<>p_actor then return jsonb_build_object('error','PAIRING_BUSY'); end if;
  update eumo_dig_pairs set request_hash=p_actor,request_label=left(p_label,32) where writer_hash=r.writer_hash;
  return jsonb_build_object('pending',true);
 elsif p_action='poll' then
  select writer_hash into target from eumo_dig_readers where reader_hash=p_actor;
  if found then return jsonb_build_object('paired',true,'deviceId',target); end if;
  if exists(select 1 from eumo_dig_pairs where request_hash=p_actor and expires_at>t) then return jsonb_build_object('pending',true); end if;
  return jsonb_build_object('error','PAIRING_EXPIRED');
 elsif p_action='poll-device' then
  select * into r from eumo_dig_pairs where writer_hash=p_actor and expires_at>t;
  if not found then return jsonb_build_object('error','PAIRING_EXPIRED'); end if;
  return jsonb_build_object('paired',r.confirmed,'requestId',r.request_hash,'label',r.request_label,'expiresAt',r.expires_at);
 elsif p_action='confirm' then
  select * into r from eumo_dig_pairs where writer_hash=p_actor and expires_at>t for update;
  if not found or r.request_hash is null or r.request_hash is distinct from p_request then return jsonb_build_object('error','PAIRING_EXPIRED'); end if;
  if (select count(*) from eumo_dig_readers where writer_hash=p_actor)>=8 and not exists(select 1 from eumo_dig_readers where reader_hash=r.request_hash) then return jsonb_build_object('error','TOO_MANY_READERS'); end if;
  insert into eumo_dig_readers(reader_hash,writer_hash) values(r.request_hash,p_actor) on conflict(reader_hash) do nothing;
  update eumo_dig_pairs set confirmed=true,code_hash=null where writer_hash=p_actor;
  return jsonb_build_object('paired',true);
 elsif p_action='revoke' then
  delete from eumo_dig_readers where writer_hash=p_actor;
  delete from eumo_dig_pairs where writer_hash=p_actor;
  return jsonb_build_object('revoked',true);
 elsif p_action='disconnect' then
  delete from eumo_dig_readers where reader_hash=p_actor;
  delete from eumo_dig_pairs where request_hash=p_actor;
  return jsonb_build_object('revoked',true);
 end if;
 return jsonb_build_object('error','INVALID_ACTION');
end; $$;

create or replace function public.eumo_read_dig(p_reader text)
returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('snapshot',s.snapshot,'sequence',s.sequence,'updated_at',s.updated_at,'deviceId',s.writer_hash,'legacyId',s.viewer_hash)
 from eumo_dig_streams s where s.viewer_hash=p_reader or s.writer_hash=(select writer_hash from eumo_dig_readers where reader_hash=p_reader) limit 1;
$$;
revoke all on function public.eumo_pair_dig(text,text,text,text,text,text),public.eumo_read_dig(text) from public,anon,authenticated;
grant execute on function public.eumo_pair_dig(text,text,text,text,text,text),public.eumo_read_dig(text) to service_role;
