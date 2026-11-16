-- Run after the existing friends database setup. Never put service-role keys in firmware.
create table if not exists public.eumo_devices (
 token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
 pair_code_hash text unique,
 pair_expires_at timestamptz not null,
 expires_at timestamptz not null,
 owner_hash text check (owner_hash is null or owner_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.eumo_devices enable row level security;
revoke all on public.eumo_devices from anon, authenticated;
grant select,insert,update,delete on public.eumo_devices to service_role;
create index if not exists eumo_devices_owner on public.eumo_devices(owner_hash);
