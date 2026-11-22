-- Seed initial SIT Qudwah budget categories without overwriting existing records.
insert into public.budget_lines (id, name, code, unit, annual_limit, used_amount)
values
  ('atk', 'ATK & Fotokopi', 'POS-5101', 'Tata Usaha', 24000000, 0),
  ('lab', 'Sarana Lab', 'POS-5204', 'Lab IPA', 18000000, 0),
  ('pemeliharaan', 'Pemeliharaan', 'POS-5302', 'Sarpras', 20000000, 0),
  ('it', 'Sarana IT', 'POS-5208', 'Tim IT', 25000000, 0),
  ('kesiswaan', 'Kegiatan Siswa', 'POS-5401', 'Kesiswaan', 30000000, 0)
on conflict (id) do nothing;

grant select on table public.budget_lines to authenticated;
