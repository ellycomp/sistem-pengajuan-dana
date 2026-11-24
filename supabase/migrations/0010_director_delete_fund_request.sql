-- Allow only the authenticated Director to permanently delete a fund request.
-- Approved requests first reverse their used-budget amount. Child request items
-- and approval stages are removed by their ON DELETE CASCADE foreign keys.

create or replace function public.delete_fund_request(p_request_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_request public.fund_requests%rowtype;
  v_total numeric(15,2);
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or v_profile.role <> 'direktur'::public.app_role then
    raise exception 'Hanya Direktur yang dapat menghapus riwayat pengajuan dana.';
  end if;

  select * into v_request
  from public.fund_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan atau sudah dihapus.';
  end if;

  if v_request.status = 'disetujui' then
    select coalesce(sum(quantity * unit_price), 0)
      into v_total
      from public.request_items
      where request_id = p_request_id;

    update public.budget_lines
      set used_amount = greatest(0, used_amount - v_total),
          updated_at = now()
      where id = v_request.budget_category_id;
  end if;

  delete from public.fund_requests where id = p_request_id;
end;
$$;

revoke all on function public.delete_fund_request(text) from public;
grant execute on function public.delete_fund_request(text) to authenticated;
