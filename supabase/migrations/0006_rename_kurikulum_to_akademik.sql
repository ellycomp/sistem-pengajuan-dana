-- Ubah nama unit pos anggaran dari Kurikulum menjadi Akademik.
update public.budget_lines
set unit = 'Akademik', updated_at = now()
where lower(trim(unit)) = 'kurikulum';
