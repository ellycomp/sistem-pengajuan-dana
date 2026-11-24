-- Perbaiki izin eksekusi RPC pembuatan pengajuan dana.
-- Jalankan melalui Supabase Dashboard > SQL Editor pada project yang dipakai aplikasi.
grant usage on schema public to authenticated;
grant execute on function public.create_fund_request(
  text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb
) to authenticated;

-- Segarkan cache API setelah perubahan izin.
notify pgrst, 'reload schema';
