-- Secure workflow: all business writes go through checked RPC functions.
-- Safe to run after 0001_initial_schema.sql. Does not delete existing records.

-- Remove permissive direct-write policies from the initial schema.
drop policy if exists "profiles_director_manage" on public.profiles;
drop policy if exists "budget_manage_authorized" on public.budget_lines;
drop policy if exists "requests_insert_own" on public.fund_requests;
drop policy if exists "requests_update_owner_or_reviewer" on public.fund_requests;
drop policy if exists "requests_delete_owner_pending" on public.fund_requests;
drop policy if exists "items_manage_request_owner_or_reviewer" on public.request_items;
drop policy if exists "stages_manage_authorized" on public.approval_stages;

-- Authenticated users may read the operational data; writes are RPC-only.
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.fund_requests from authenticated;
revoke insert, update, delete on public.request_items from authenticated;
revoke insert, update, delete on public.approval_stages from authenticated;
revoke insert, update, delete on public.budget_lines from authenticated;

create or replace function public.create_fund_request(
  p_id text,
  p_code text,
  p_title text,
  p_school_unit text,
  p_budget_category_id text,
  p_budget_category_name text,
  p_unit text,
  p_requester_role text,
  p_submitted_date text,
  p_target_date text,
  p_attachment_name text,
  p_items jsonb,
  p_stages jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_stage jsonb;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil pengguna tidak ditemukan.'; end if;
  if p_id is null or p_code is null or length(trim(p_title)) = 0 then
    raise exception 'Data pengajuan tidak lengkap.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Rincian belanja wajib diisi.';
  end if;
  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) < 5 then
    raise exception 'Tahapan persetujuan tidak lengkap.';
  end if;

  insert into public.fund_requests (
    id, code, title, school_unit, budget_category_id, budget_category_name,
    unit, requester_id, requester_name, requester_role, submitted_date,
    target_date, attachment_name, status, current_stage_step
  ) values (
    p_id, p_code, trim(p_title), p_school_unit, p_budget_category_id,
    p_budget_category_name, coalesce(p_unit,''), v_profile.id, v_profile.name,
    v_profile.role::text, p_submitted_date, p_target_date,
    coalesce(p_attachment_name,''), 'diproses', 2
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.request_items(id, request_id, name, quantity, unit_label, unit_price)
    values (
      coalesce(v_item->>'id', gen_random_uuid()::text), p_id,
      trim(v_item->>'name'), (v_item->>'quantity')::numeric,
      coalesce(v_item->>'unitLabel',''), (v_item->>'unitPrice')::numeric
    );
  end loop;

  for v_stage in select value from jsonb_array_elements(p_stages)
  loop
    -- Stage identity and role must match a real profile; clients cannot assign
    -- themselves a fabricated reviewer or alter the approval chain.
    if (v_stage->>'step')::integer = 1 then
      if (v_stage->>'roleKey') <> 'guru'
         or (v_stage->>'personName') <> v_profile.name then
        raise exception 'Tahap pengaju tidak valid.';
      end if;
    elsif (v_stage->>'step')::integer between 2 and 5 then
      if ( (v_stage->>'roleKey')::public.app_role <>
         (case (v_stage->>'step')::integer
           when 2 then 'sarana'::public.app_role
           when 3 then 'bendahara-sekolah'::public.app_role
           when 4 then 'bendahara-umum'::public.app_role
           when 5 then 'direktur'::public.app_role
         end)
         or not exists (
           select 1 from public.profiles p
           where p.role = (v_stage->>'roleKey')::public.app_role
             and lower(p.name) = lower(v_stage->>'personName')
         )) then
        raise exception 'Petugas tahap persetujuan tidak valid atau belum memiliki akun.';
      end if;
    else
      raise exception 'Nomor tahap persetujuan tidak valid.';
    end if;

    insert into public.approval_stages(
      request_id, step, role_key, role_label, person_name, person_title,
      state, note, timestamp_label
    ) values (
      p_id, (v_stage->>'step')::integer, (v_stage->>'roleKey')::public.app_role,
      v_stage->>'roleLabel', v_stage->>'personName',
      coalesce(v_stage->>'personTitle',''),
      (v_stage->>'state')::public.stage_state, v_stage->>'note',
      v_stage->>'timestamp'
    );
  end loop;
  return p_id;
end;
$$;

create or replace function public.review_fund_request(
  p_request_id text,
  p_action text,
  p_note text,
  p_timestamp text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_request public.fund_requests%rowtype;
  v_stage public.approval_stages%rowtype;
  v_next integer;
  v_total numeric(15,2);
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil pengguna tidak ditemukan.'; end if;
  select * into v_request from public.fund_requests where id = p_request_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan.'; end if;
  if v_request.status <> 'diproses' then raise exception 'Pengajuan tidak sedang diproses.'; end if;

  select * into v_stage from public.approval_stages
   where request_id = p_request_id and step = v_request.current_stage_step for update;
  if not found or v_stage.state <> 'active'
     or v_stage.role_key <> v_profile.role
     or lower(v_stage.person_name) <> lower(v_profile.name) then
    raise exception 'Akun ini bukan petugas pada tahap persetujuan aktif.';
  end if;
  if p_action not in ('approve','revision') then raise exception 'Aksi tidak valid.'; end if;
  if p_action = 'revision' and length(trim(coalesce(p_note,''))) = 0 then
    raise exception 'Catatan revisi wajib diisi.';
  end if;

  if p_action = 'revision' then
    update public.approval_stages
      set state = 'revisi', note = 'Revisi: ' || p_note,
          timestamp_label = 'Dikembalikan · ' || p_timestamp
      where id = v_stage.id;
    update public.fund_requests
      set status = 'revisi', revision_note = p_note,
          revision_by = v_profile.name, updated_at = now()
      where id = p_request_id;
    return;
  end if;

  update public.approval_stages
    set state = 'done',
        note = case when coalesce(p_note,'') <> '' then 'Catatan: ' || p_note else note end,
        timestamp_label = 'Disetujui · ' || p_timestamp
    where id = v_stage.id;

  v_next := v_request.current_stage_step + 1;
  if v_request.current_stage_step >= 5 then
    update public.fund_requests
      set status = 'disetujui', current_stage_step = 6, updated_at = now()
      where id = p_request_id;
    select coalesce(sum(quantity * unit_price),0) into v_total
      from public.request_items where request_id = p_request_id;
    update public.budget_lines
      set used_amount = used_amount + v_total, updated_at = now()
      where id = v_request.budget_category_id;
  else
    update public.approval_stages set state = 'active',
      note = 'Sedang menunggu pemeriksaan petugas tahap ini'
      where request_id = p_request_id and step = v_next;
    update public.fund_requests
      set current_stage_step = v_next, updated_at = now()
      where id = p_request_id;
  end if;
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
  select * into v_request from public.fund_requests
   where id = p_request_id for update;
  if not found or v_request.requester_id <> auth.uid() then
    raise exception 'Pengajuan bukan milik akun ini.';
  end if;
  if v_request.status <> 'revisi' then raise exception 'Pengajuan tidak sedang dalam status revisi.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Rincian belanja wajib diisi.';
  end if;

  update public.fund_requests set title = trim(p_title),
    target_date = p_target_date, attachment_name = coalesce(p_attachment_name,''),
    status = 'diproses', current_stage_step = 2,
    revision_note = null, revision_by = null, updated_at = now()
    where id = p_request_id;

  delete from public.request_items where request_id = p_request_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.request_items(id, request_id, name, quantity, unit_label, unit_price)
    values (
      coalesce(v_item->>'id', gen_random_uuid()::text), p_request_id,
      trim(v_item->>'name'), (v_item->>'quantity')::numeric,
      coalesce(v_item->>'unitLabel',''), (v_item->>'unitPrice')::numeric
    );
  end loop;

  update public.approval_stages set state = case when step = 1 then 'done'
    when step = 2 then 'active' else 'pending' end,
    note = case when step = 2 then 'Pengajuan ulang menunggu pemeriksaan'
      when step > 2 then 'Menunggu persetujuan tahap sebelumnya' else note end,
    timestamp_label = case when step = 1 then 'Diajukan ulang · ' || p_timestamp else null end
    where request_id = p_request_id;
end;
$$;

revoke all on function public.create_fund_request(text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb) from public;
revoke all on function public.review_fund_request(text,text,text,text) from public;
revoke all on function public.resubmit_fund_request(text,text,text,text,jsonb,text) from public;
grant execute on function public.create_fund_request(text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb) to authenticated;
grant execute on function public.review_fund_request(text,text,text,text) to authenticated;
grant execute on function public.resubmit_fund_request(text,text,text,text,jsonb,text) to authenticated;
