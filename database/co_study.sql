-- Additive co-study schema. Apply after friends.sql; no game-save data is changed.
-- Browser roles have no direct access. Server API supplies authenticated identity
-- and server time; the optional clock argument is never accepted from clients.
-- Apply the complete script as the database owner. Reapplying it preserves rows.
-- Roll back the UI/API first; retain these independent tables for recovery.
-- Do not drop tables containing pilot history unless that deletion is authorized.
begin;
create table if not exists public.eumo_study_rooms (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references public.eumo_friend_profiles(id) on delete cascade,
 guest_id uuid not null references public.eumo_friend_profiles(id) on delete cascade,
 status text not null default 'inviting',
 mode text not null default 'together' check(mode in ('together','challenge')),
 version integer not null default 1,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 data jsonb not null,
 check(host_id<>guest_id),
 check(status in ('inviting','ready','active','between_rounds','finished','cancelled','expired'))
);
create index if not exists eumo_study_rooms_host on public.eumo_study_rooms(host_id,updated_at desc);
create index if not exists eumo_study_rooms_guest on public.eumo_study_rooms(guest_id,updated_at desc);
create table if not exists public.eumo_study_awards (
 room_id uuid not null references public.eumo_study_rooms(id) on delete cascade,
 round_id uuid not null,
 user_id uuid not null references public.eumo_friend_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(room_id,round_id,user_id)
);
create table if not exists public.eumo_study_requests (
 actor_id uuid not null references public.eumo_friend_profiles(id) on delete cascade,
 request_id uuid not null,
 fingerprint text not null,
 room_id uuid references public.eumo_study_rooms(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table public.eumo_study_rooms enable row level security;
alter table public.eumo_study_awards enable row level security;
alter table public.eumo_study_requests enable row level security;
revoke all on public.eumo_study_rooms,public.eumo_study_awards,public.eumo_study_requests from public,anon,authenticated;

create or replace function public.eumo_study_view(p_room public.eumo_study_rooms,p_actor uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p_room.id,'hostId',p_room.host_id,'guestId',p_room.guest_id,
 'status',p_room.status,'mode',p_room.mode,'version',p_room.version,'plannedSeconds',1200,'maxRounds',2,
 'expiresAt',floor(extract(epoch from p_room.expires_at)*1000),
 'roundIndex',coalesce((p_room.data->>'roundIndex')::integer,0),'roundId',p_room.data->'roundId',
 'startsAt',p_room.data->'startsAt',
 'history',coalesce((select jsonb_agg(jsonb_build_object(
   'roundId',h.value->'roundId','roundIndex',h.value->'roundIndex',
   'members',(select jsonb_agg(jsonb_build_object(
     'id',e.value->'id','status',e.value->'status','elapsedSeconds',e.value->'elapsedSeconds',
     'verification',e.value->'verification','lastConfirmedAt',e.value->'checkpoint',
     'shareTask',coalesce(e.value->'shareTask','false'::jsonb),
     'task',case when e.value->>'id'=p_actor::text or coalesce((e.value->>'shareTask')::boolean,false) then coalesce(e.value->>'task','') else '' end,
     'review',case when e.value->>'id'=p_actor::text then e.value->'review' else null end,
     'sourceSessionId',case when e.value->>'id'=p_actor::text then e.value->'sourceSessionId' else null end))
     from jsonb_array_elements(h.value->'members') e)))
   from jsonb_array_elements(coalesce(p_room.data->'history','[]'::jsonb)) h),'[]'::jsonb),
 'members',(select jsonb_agg(jsonb_build_object(
   'id',p.id,'name',coalesce(p.snapshot->>'name','Momo'),'color',coalesce(p.snapshot->>'color','#b784cf'),
   'status',m.value->>'status','ready',coalesce((m.value->>'ready')::boolean,false),
   'shareTask',coalesce((m.value->>'shareTask')::boolean,false),
   'task',case when p.id=p_actor or coalesce((m.value->>'shareTask')::boolean,false) then coalesce(m.value->>'task','') else '' end,
   'elapsedSeconds',coalesce((m.value->>'elapsedSeconds')::numeric,0),'lastSeen',m.value->'lastSeen','lastConfirmedAt',m.value->'checkpoint',
   'controlVersion',coalesce((m.value->>'controlVersion')::integer,0),
   'sourceSessionId',case when p.id=p_actor then m.value->'sourceSessionId' else null end,
   'review',case when p.id=p_actor then m.value->'review' else null end,
   'points',(select count(*) from public.eumo_study_awards a where a.room_id=p_room.id and a.user_id=p.id),
   'verification',coalesce(m.value->>'verification','verified')) order by p.id)
   from jsonb_each(p_room.data->'members') m join public.eumo_friend_profiles p on p.id::text=m.key))
 where p_actor in (p_room.host_id,p_room.guest_id);
$$;
revoke all on function public.eumo_study_view(public.eumo_study_rooms,uuid) from public,anon,authenticated;

create or replace function public.eumo_co_study_action(p_token_hash text,p_action text,p_payload jsonb default '{}'::jsonb,p_now timestamptz default clock_timestamp())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 actor public.eumo_friend_profiles;
 room public.eumo_study_rooms;
 replay public.eumo_study_requests;
 rid uuid;req uuid;friend uuid;uid uuid;
 ms numeric:=floor(extract(epoch from p_now)*1000);
 m jsonb;other jsonb;members jsonb;room_data jsonb;hist jsonb;summary jsonb;
 elapsed numeric;checkpoint numeric;gap numeric;fp text;notice text;result jsonb;
 settingmode text;oldstatus text;is_replay boolean:=false;
begin
 if p_now is null or p_token_hash is null or p_token_hash!~'^[a-f0-9]{64}$' then return jsonb_build_object('error','UNAUTHORIZED');end if;
 select * into actor from public.eumo_friend_profiles where auth_hash=p_token_hash;
 if actor.id is null then return jsonb_build_object('error','UNAUTHORIZED');end if;
 if p_action not in ('state','create','accept','decline','cancel','ready','settings','start','heartbeat','pause','resume','finish','review','leave') or jsonb_typeof(p_payload)<>'object' then return jsonb_build_object('error','INVALID_REQUEST');end if;
 -- A short transaction-wide lock keeps busy-member checks and cross-room
 -- invitations atomic for this small pilot. Room state is persisted, not cached.
 perform pg_advisory_xact_lock(17843501);
 update public.eumo_study_rooms set status='expired',version=version+1,updated_at=p_now where status='inviting' and expires_at<=p_now;
 if p_action<>'state' then
  if coalesce(p_payload->>'requestId','')!~*'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then return jsonb_build_object('error','INVALID_REQUEST');end if;
  req:=(p_payload->>'requestId')::uuid;fp:=md5(p_action||':'||(p_payload-'requestId')::text);
  select * into replay from public.eumo_study_requests where actor_id=actor.id and request_id=req;
  if replay.actor_id is not null then
   if replay.fingerprint<>fp then return jsonb_build_object('error','REQUEST_REUSED');end if;
   rid:=replay.room_id;is_replay:=true;notice:='ALREADY_APPLIED';
  end if;
 end if;
 if not is_replay and p_payload ? 'roomId' then
  if coalesce(p_payload->>'roomId','')!~*'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then return jsonb_build_object('error','INVALID_REQUEST');end if;
  rid:=(p_payload->>'roomId')::uuid;
 end if;
 if p_action='create' and not is_replay then
  if coalesce(p_payload->>'friendId','')!~*'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' or coalesce(p_payload->>'mode','together') not in ('together','challenge') then return jsonb_build_object('error','INVALID_REQUEST');end if;
  friend:=(p_payload->>'friendId')::uuid;
  if not exists(select 1 from public.eumo_friend_links where status='accepted' and pair_key=least(actor.id::text,friend::text)||':'||greatest(actor.id::text,friend::text)) then return jsonb_build_object('error','NOT_FRIENDS');end if;
  if exists(select 1 from public.eumo_study_rooms r where r.status in ('inviting','ready','active','between_rounds') and ((r.host_id=actor.id or r.guest_id=actor.id and r.status<>'inviting') or (r.status<>'inviting' and friend in(r.host_id,r.guest_id))) and coalesce(r.data->'members'->actor.id::text->>'status','')<>'left') then return jsonb_build_object('error','MEMBER_BUSY');end if;
  if (select count(*) from public.eumo_study_requests where actor_id=actor.id and created_at>p_now-interval '1 hour')>=500 then return jsonb_build_object('error','REQUEST_LIMITED');end if;
  if (select count(*) from public.eumo_study_rooms where host_id=actor.id and guest_id=friend and created_at>p_now-interval '5 minutes')>=5 then return jsonb_build_object('error','REQUEST_LIMITED');end if;
  members:=jsonb_build_object(actor.id::text,jsonb_build_object('status','joined','ready',false,'task','','shareTask',false,'elapsedSeconds',0,'lastSeen',ms),friend::text,jsonb_build_object('status','invited','ready',false,'task','','shareTask',false,'elapsedSeconds',0));
  insert into public.eumo_study_rooms(host_id,guest_id,mode,expires_at,created_at,updated_at,data)
   values(actor.id,friend,coalesce(p_payload->>'mode','together'),p_now+interval '5 minutes',p_now,p_now,jsonb_build_object('members',members,'roundIndex',0,'history','[]'::jsonb)) returning * into room;
  rid:=room.id;notice:='INVITED';
 elsif rid is not null then
  select * into room from public.eumo_study_rooms where id=rid for update;
  if room.id is null or actor.id not in (room.host_id,room.guest_id) then return jsonb_build_object('error','ROOM_NOT_FOUND');end if;
  if p_action not in ('leave','state') and not exists(select 1 from public.eumo_friend_links where status='accepted' and pair_key=least(room.host_id::text,room.guest_id::text)||':'||greatest(room.host_id::text,room.guest_id::text)) then return jsonb_build_object('error','NOT_FRIENDS');end if;
 elsif p_action<>'state' then return jsonb_build_object('error','INVALID_REQUEST');
 end if;
 if p_action not in ('state','create') and not is_replay then
  if p_payload ? 'expectedVersion' and (p_payload->>'expectedVersion')::integer<>room.version then return jsonb_build_object('error','STALE_VERSION','version',room.version);end if;
  room_data:=room.data;members:=room_data->'members';m:=members->actor.id::text;oldstatus:=m->>'status';
  if p_action in ('accept','decline','cancel') then
   if room.status<>'inviting' then return jsonb_build_object('error',case when room.status='expired' then 'INVITE_EXPIRED' else 'INVALID_STATE' end);end if;
   if p_action in ('accept','decline') and actor.id<>room.guest_id or p_action='cancel' and actor.id<>room.host_id then return jsonb_build_object('error','FORBIDDEN');end if;
   if p_action='accept' then
    if exists(select 1 from public.eumo_study_rooms r where r.id<>room.id and r.status in ('inviting','ready','active','between_rounds') and (r.host_id=actor.id or r.guest_id=actor.id and r.status<>'inviting') and r.data->'members'->actor.id::text->>'status'<>'left') then return jsonb_build_object('error','MEMBER_BUSY');end if;
    m:=m||jsonb_build_object('status','joined','lastSeen',ms);room.status:='ready';notice:='JOINED';
   else room.status:='cancelled';notice:='INVITE_CLOSED';end if;
  elsif p_action='settings' then
   if actor.id<>room.host_id then return jsonb_build_object('error','FORBIDDEN');end if;
   if room.status not in ('inviting','ready') or (room_data->>'roundIndex')::integer<>0 then return jsonb_build_object('error','INVALID_STATE');end if;
   settingmode:=p_payload->>'mode';if settingmode is null or settingmode not in ('together','challenge') then return jsonb_build_object('error','INVALID_REQUEST');end if;
   room.mode:=settingmode;
   for uid in select key::uuid from jsonb_each(members) loop members:=jsonb_set(members,array[uid::text,'ready'],'false');if members->uid::text->>'status'='ready' then members:=jsonb_set(members,array[uid::text,'status'],'"joined"');end if;end loop;
   m:=members->actor.id::text;notice:='SETTINGS_CHANGED';
  elsif p_action='ready' then
   if room.status not in ('ready','between_rounds') or oldstatus='left' then return jsonb_build_object('error','INVALID_STATE');end if;
   if jsonb_typeof(p_payload->'ready')<>'boolean' or jsonb_typeof(p_payload->'shareTask')<>'boolean' or length(coalesce(p_payload->>'task',''))>100 then return jsonb_build_object('error','INVALID_REQUEST');end if;
   if exists(select 1 from public.eumo_study_rooms r where r.id<>room.id and r.status in ('ready','active','between_rounds') and actor.id in(r.host_id,r.guest_id) and r.data->'members'->actor.id::text->>'status'<>'left') then return jsonb_build_object('error','MEMBER_BUSY');end if;
   m:=m||jsonb_build_object('ready',(p_payload->>'ready')::boolean,'status',case when (p_payload->>'ready')::boolean then 'ready' else 'joined' end,'task',coalesce(p_payload->>'task',''),'shareTask',(p_payload->>'shareTask')::boolean,'lastSeen',ms);
  elsif p_action='start' then
   if actor.id<>room.host_id then return jsonb_build_object('error','FORBIDDEN');end if;
   if room.status not in ('ready','between_rounds') or (room_data->>'roundIndex')::integer>=2 then return jsonb_build_object('error','INVALID_STATE');end if;
   if exists(select 1 from jsonb_each(members) e where e.value->>'status'='left' or not coalesce((e.value->>'ready')::boolean,false)) then return jsonb_build_object('error','NOT_READY');end if;
   if exists(select 1 from public.eumo_study_rooms r where r.id<>room.id and r.status in ('ready','active','between_rounds') and (room.host_id in(r.host_id,r.guest_id) or room.guest_id in(r.host_id,r.guest_id)) and (r.data->'members'->room.host_id::text->>'status'<>'left' or r.data->'members'->room.guest_id::text->>'status'<>'left')) then return jsonb_build_object('error','MEMBER_BUSY');end if;
   room_data:=room_data||jsonb_build_object('roundId',gen_random_uuid(),'roundIndex',(room_data->>'roundIndex')::integer+1,'startsAt',ms+3000);
   for uid in select key::uuid from jsonb_each(members) loop
    other:=members->uid::text;
    other:=other||jsonb_build_object('status','studying','ready',false,'elapsedSeconds',0,'lastSeen',ms,'checkpoint',ms+3000,'sourceSessionId',gen_random_uuid(),'controlVersion',0,'verification','verified','review',null);
    members:=jsonb_set(members,array[uid::text],other);
   end loop;
   m:=members->actor.id::text;room.status:='active';notice:='STARTED';
  elsif p_action in ('heartbeat','pause','resume','finish','review') then
   if room.status not in ('active','between_rounds','finished') or p_payload->>'roundId' is distinct from room_data->>'roundId' then return jsonb_build_object('error','STALE_ROUND');end if;
   if oldstatus in ('left','invited') then return jsonb_build_object('error','INVALID_STATE');end if;
   if p_action<>'review' and p_payload->>'sourceSessionId' is distinct from m->>'sourceSessionId' then return jsonb_build_object('error','SESSION_MISMATCH');end if;
   -- Room versions also change for the partner's heartbeats. Independent
   -- control versions reject a delayed resume after a more recent pause.
   if p_action in ('pause','resume','finish') then
    if coalesce(p_payload->>'expectedControlVersion','')!~'^[0-9]+$' then return jsonb_build_object('error','INVALID_REQUEST');end if;
    if (p_payload->>'expectedControlVersion')::integer<>coalesce((m->>'controlVersion')::integer,0) then return jsonb_build_object('error','STALE_CONTROL');end if;
   end if;
   if p_action='resume' and oldstatus<>'paused' then return jsonb_build_object('error','INVALID_STATE');end if;
   if p_action='pause' and oldstatus<>'studying' then return jsonb_build_object('error','INVALID_STATE');end if;
   if p_action='finish' and oldstatus not in ('studying','paused','review_pending') then return jsonb_build_object('error','INVALID_STATE');end if;
   -- A short interruption can fit inside the normal heartbeat window. If a
   -- local pause/resume could not be acknowledged, discard that uncertain gap
   -- even when it is under 45 seconds. This client signal can only downgrade
   -- verification; it cannot add time, claim a point or restore eligibility.
   if p_action in ('heartbeat','pause','resume','finish') and p_payload ? 'uncertainInterval' then
    if jsonb_typeof(p_payload->'uncertainInterval')<>'boolean' then return jsonb_build_object('error','INVALID_REQUEST');end if;
    if (p_payload->>'uncertainInterval')::boolean and oldstatus in ('studying','paused','review_pending') then
     m:=m||jsonb_build_object('verification','pending_verification','checkpoint',greatest(ms,coalesce((m->>'checkpoint')::numeric,ms)));
    end if;
   end if;
   if oldstatus='studying' then
    checkpoint:=(m->>'checkpoint')::numeric;gap:=ms-checkpoint;elapsed:=(m->>'elapsedSeconds')::numeric;
    if gap<0 then
     if p_action in ('pause','finish') then return jsonb_build_object('error','NOT_STARTED');end if;
    elsif gap<=45000 then
     elapsed:=least(1200,elapsed+gap/1000);m:=m||jsonb_build_object('elapsedSeconds',elapsed,'checkpoint',ms);
    else m:=m||jsonb_build_object('verification','pending_verification','checkpoint',ms);end if;
    if (m->>'elapsedSeconds')::numeric>=1200 then m:=m||jsonb_build_object('status','review_pending');end if;
   end if;
   m:=m||jsonb_build_object('lastSeen',ms);
   if p_action in ('pause','resume','finish') then m:=m||jsonb_build_object('controlVersion',coalesce((m->>'controlVersion')::integer,0)+1);end if;
   if p_action='pause' and m->>'status'='studying' then m:=m||jsonb_build_object('status','paused');
   elsif p_action='resume' then m:=m||jsonb_build_object('status','studying','checkpoint',ms);
   elsif p_action='finish' then
    if (m->>'elapsedSeconds')::numeric>=1200 then m:=m||jsonb_build_object('status','review_pending');
    elsif coalesce(p_payload->>'outcome','stopped')='complete' then m:=m||jsonb_build_object('status','review_pending','verification','pending_verification');
    else m:=m||jsonb_build_object('status','stopped');end if;
   elsif p_action='review' then
    if m->>'status' not in ('review_pending','completed','stopped') or coalesce(p_payload->>'outcome','') not in ('complete','partial','adjusted') or length(coalesce(p_payload->>'note',''))>160 then return jsonb_build_object('error','INVALID_STATE');end if;
    m:=m||jsonb_build_object('review',jsonb_build_object('outcome',p_payload->>'outcome','note',coalesce(p_payload->>'note',''),'at',ms));
    if m->>'status'<>'stopped' then m:=m||jsonb_build_object('status','completed');end if;
    if room.mode='challenge' and m->>'status'='completed' and (m->>'elapsedSeconds')::numeric>=1200 and m->>'verification'='verified' then
     insert into public.eumo_study_awards(room_id,round_id,user_id,created_at) values(room.id,(room_data->>'roundId')::uuid,actor.id,p_now) on conflict do nothing;
    end if;
   end if;
  elsif p_action='leave' then
   if oldstatus='left' then return jsonb_build_object('error','INVALID_STATE');end if;
   m:=m||jsonb_build_object('status','left','ready',false,'lastSeen',ms);
   if room.status in ('inviting','ready','between_rounds') then room.status:='cancelled';end if;
  end if;
  members:=jsonb_set(members,array[actor.id::text],m);room_data:=jsonb_set(room_data,'{members}',members);
  -- Preserve source session IDs, tasks and honest reviews across rounds. The
  -- public view above removes the other participant's private fields.
  summary:=jsonb_build_object('roundId',room_data->'roundId','roundIndex',room_data->'roundIndex','members',(select jsonb_agg(e.value||jsonb_build_object('id',e.key)) from jsonb_each(members) e));
  if room.status='active' and not exists(select 1 from jsonb_each(members) e where e.value->>'status' in ('studying','paused','review_pending')) then
   if (room_data->>'roundIndex')::integer>=2 or exists(select 1 from jsonb_each(members) e where e.value->>'status'='left') then room.status:='finished';else room.status:='between_rounds';end if;
   room_data:=jsonb_set(room_data,'{history}',coalesce(room_data->'history','[]'::jsonb)||jsonb_build_array(summary));
  elsif p_action='review' and room.status in ('between_rounds','finished') then
   select jsonb_agg(case when h.value->>'roundId'=room_data->>'roundId' then summary else h.value end) into hist from jsonb_array_elements(room_data->'history') h;
   room_data:=jsonb_set(room_data,'{history}',coalesce(hist,'[]'::jsonb));
  end if;
  update public.eumo_study_rooms set status=room.status,mode=room.mode,version=version+1,data=room_data,updated_at=p_now where id=room.id returning * into room;
 end if;
 if p_action<>'state' and not is_replay then insert into public.eumo_study_requests(actor_id,request_id,fingerprint,room_id,created_at) values(actor.id,req,fp,rid,p_now);end if;
 -- Read only rooms in which this authenticated profile participates. State is
 -- explicitly unavailable after a friend relation is revoked; leave still works.
 if p_action='state' and rid is not null and not exists(select 1 from public.eumo_friend_links where status='accepted' and pair_key=least(room.host_id::text,room.guest_id::text)||':'||greatest(room.host_id::text,room.guest_id::text)) then return jsonb_build_object('error','NOT_FRIENDS');end if;
 select jsonb_build_object('self',jsonb_build_object('id',actor.id),'serverTime',ms,'notice',notice,
 'room',case when room.id is null then null else public.eumo_study_view(room,actor.id) end,
 'rooms',coalesce((select jsonb_agg(public.eumo_study_view(r,actor.id) order by r.updated_at desc) from (select r.* from public.eumo_study_rooms r where actor.id in(r.host_id,r.guest_id) and exists(select 1 from public.eumo_friend_links l where l.status='accepted' and l.pair_key=least(r.host_id::text,r.guest_id::text)||':'||greatest(r.host_id::text,r.guest_id::text)) order by r.updated_at desc limit 20) r),'[]'::jsonb)) into result;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','INVALID_REQUEST');
end;
$$;
revoke all on function public.eumo_co_study_action(text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.eumo_co_study_action(text,text,jsonb,timestamptz) to service_role;
grant select,insert,update,delete on public.eumo_study_rooms,public.eumo_study_awards,public.eumo_study_requests to service_role;
commit;
