-- Daftar Unit Pengaju yang dapat dikelola Direktur.
-- Aman untuk data lama: hanya menambah tabel baru; tidak mengubah fund_requests.
create table if not exists public.request_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.request_units enable row level security;

drop policy if exists "request_units_read_authenticated" on public.request_units;
create policy "request_units_read_authenticated"
on public.request_units for select to authenticated
using (true);

drop policy if exists "request_units_director_manage" on public.request_units;
create policy "request_units_director_manage"
on public.request_units for all to authenticated
using (public.current_app_role() = 'direktur')
with check (public.current_app_role() = 'direktur');

insert into public.request_units (name, active)
values
  ('Dapur', true),
  ('Wakil Kurikulum', true),
  ('Wakil Kesiswaan', true),
  ('Wakil Sarpras', true),
  ('Wakil Humas', true),
  ('Kelas', true)
on conflict (name) do nothing;

-- Berikan hak akses tabel kepada pengguna login; RLS tetap membatasi perubahan kepada Direktur.
grant select, insert, update on table public.request_units to authenticated;

-- Minta PostgREST memuat ulang cache skema agar tabel langsung dikenali API.
notify pgrst, 'reload schema';
