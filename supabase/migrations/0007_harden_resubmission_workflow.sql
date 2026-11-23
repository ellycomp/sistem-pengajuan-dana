-- Persist revision edits safely and restart the approval chain from Kasi Sarana.
create or replace function public.save_fund_request_revision(
  p_request_id text,
  p_title text,
  p_target_date text,
  p_attachment_name text,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.fund_requests%rowtype;
  v_item jsonb;
begin
  select * into v_request
  from public.fund_requests
  where id = p_request_id
  for update;

  if not found or v_request.requester_id <> auth.uid() then
    raise exception 'Pengajuan bukan milik akun ini.';
  end if;
  if v_request.status <> 'revisi' then
    raise exception 'Pengajuan tidak sedang dalam status revisi.';
  end if;
  if length(trim(coalesce(p_title,''))) = 0 then
    raise exception 'Judul pengajuan wajib diisi.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Rincian belanja wajib diisi.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if length(trim(coalesce(v_item->>'name',''))) = 0
       or coalesce((v_item->>'quantity')::numeric,0) <= 0
       or coalesce((v_item->>'unitPrice')::numeric,0) <= 0 then
      raise exception 'Nama barang, jumlah, dan harga satuan harus valid.';
    end if;
  end loop;

  update public.fund_requests
  set title = trim(p_title),
      target_date = coalesce(p_target_date,''),
      attachment_name = coalesce(p_attachment_name,''),
      updated_at = now()
  where id = p_request_id;

  delete from public.request_items where request_id = p_request_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.request_items(id, request_id, name, quantity, unit_label, unit_price)
    values (
      coalesce(nullif(v_item->>'id',''), gen_random_uuid()::text),
      p_request_id, trim(v_item->>'name'),
      (v_item->>'quantity')::numeric,
      coalesce(v_item->>'unitLabel',''),
      (v_item->>'unitPrice')::numeric
    );
  end loop;
end;
$$;

create or replace function public.resubmit_fund_request(
  p_request_id text,
  p_title text,
  p_target_date text,
  p_attachment_name text,
  p_items jsonb,
  p_timestamp text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.fund_requests%rowtype;
  v_item jsonb;
begin
  select * into v_request
  from public.fund_requests
  where id = p_request_id
  for update;

  if not found or v_request.requester_id <> auth.uid() then
    raise exception 'Pengajuan bukan milik akun ini.';
  end if;
  if v_request.status <> 'revisi' then
    raise exception 'Pengajuan tidak sedang dalam status revisi.';
  end if;
  if length(trim(coalesce(p_title,''))) = 0 then
    raise exception 'Judul pengajuan wajib diisi.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Rincian belanja wajib diisi.';
  end if;
  if not exists (
    select 1 from public.approval_stages
    where request_id = p_request_id and step = 2
      and role_key = 'sarana'::public.app_role
  ) then
    raise exception 'Petugas Kasi Sarana belum ditetapkan pada pengajuan ini. Hubungi Direktur.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if length(trim(coalesce(v_item->>'name',''))) = 0
       or coalesce((v_item->>'quantity')::numeric,0) <= 0
       or coalesce((v_item->>'unitPrice')::numeric,0) <= 0 then
      raise exception 'Nama barang, jumlah, dan harga satuan harus valid.';
    end if;
  end loop;

  update public.fund_requests
  set title = trim(p_title),
      target_date = coalesce(p_target_date,''),
      attachment_name = coalesce(p_attachment_name,''),
      status = 'diproses',
      current_stage_step = 2,
      revision_note = null,
      revision_by = null,
      updated_at = now()
  where id = p_request_id;

  delete from public.request_items where request_id = p_request_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.request_items(id, request_id, name, quantity, unit_label, unit_price)
    values (
      coalesce(nullif(v_item->>'id',''), gen_random_uuid()::text),
      p_request_id, trim(v_item->>'name'),
      (v_item->>'quantity')::numeric,
      coalesce(v_item->>'unitLabel',''),
      (v_item->>'unitPrice')::numeric
    );
  end loop;

  update public.approval_stages
  set state = case
        when step = 1 then 'done'::public.stage_state
        when step = 2 then 'active'::public.stage_state
        else 'pending'::public.stage_state
      end,
      note = case
        when step = 2 then 'Pengajuan ulang menunggu pemeriksaan Kasi Sarana'
        when step > 2 then 'Menunggu persetujuan tahap sebelumnya'
        else note
      end,
      timestamp_label = case
        when step = 1 then 'Diajukan ulang · ' || p_timestamp
        else null
      end
  where request_id = p_request_id
    and step between 1 and 5;
end;
$$;

revoke all on function public.save_fund_request_revision(text,text,text,text,jsonb) from public;
revoke all on function public.resubmit_fund_request(text,text,text,text,jsonb,text) from public;
grant execute on function public.save_fund_request_revision(text,text,text,text,jsonb) to authenticated;
grant execute on function public.resubmit_fund_request(text,text,text,text,jsonb,text) to authenticated;
