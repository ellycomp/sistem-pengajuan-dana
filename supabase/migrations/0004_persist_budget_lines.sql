-- Simpan Pos Anggaran langsung ke Supabase.
-- Jalankan di Supabase Dashboard > SQL Editor.
create or replace function public.save_budget_line(
  p_action text,
  p_id text,
  p_name text,
  p_code text,
  p_unit text,
  p_annual_limit numeric default 0
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('direktur', 'bendahara-umum') then
    raise exception 'Hanya Direktur atau Bendahara Umum yang dapat mengelola pos anggaran.';
  end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_code),'') = '' or coalesce(trim(p_unit),'') = '' then
    raise exception 'Kode pos, nama pos, dan unit wajib diisi.';
  end if;
  if exists (
    select 1 from public.budget_lines
    where lower(name) = lower(trim(p_name))
       or lower(code) = lower(trim(p_code))
      and id <> coalesce(p_id,'')
  ) then
    raise exception 'Kode atau nama pos anggaran sudah digunakan.';
  end if;

  if p_action = 'insert' then
    insert into public.budget_lines(id,name,code,unit,annual_limit,used_amount)
    values (p_id,trim(p_name),upper(trim(p_code)),trim(p_unit),coalesce(p_annual_limit,0),0);
  elsif p_action = 'update' then
    update public.budget_lines
      set name=trim(p_name), code=upper(trim(p_code)), unit=trim(p_unit),
          annual_limit=coalesce(p_annual_limit,annual_limit), updated_at=now()
      where id=p_id;
    if not found then raise exception 'Pos anggaran tidak ditemukan.'; end if;
  else
    raise exception 'Aksi penyimpanan tidak valid.';
  end if;
  return p_id;
end;
$$;

revoke all on function public.save_budget_line(text,text,text,text,text,numeric) from public;
grant execute on function public.save_budget_line(text,text,text,text,text,numeric) to authenticated;
