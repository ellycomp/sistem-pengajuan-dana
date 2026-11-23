-- Hapus Pos Anggaran dengan pemeriksaan hak akses dan riwayat pengajuan.
create or replace function public.delete_budget_line(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  select role into v_role
  from public.profiles
  where id = auth.uid();

  if v_role not in ('direktur', 'bendahara-umum') then
    raise exception 'Hanya Direktur atau Bendahara Umum yang dapat menghapus pos anggaran.';
  end if;

  if exists (
    select 1 from public.fund_requests
    where budget_category_id = p_id
  ) then
    raise exception 'Pos tidak dapat dihapus karena sudah digunakan dalam pengajuan dana.';
  end if;

  delete from public.budget_lines where id = p_id;
  if not found then
    raise exception 'Pos anggaran tidak ditemukan.';
  end if;

  return p_id;
end;
$$;

revoke all on function public.delete_budget_line(text) from public;
grant execute on function public.delete_budget_line(text) to authenticated;
