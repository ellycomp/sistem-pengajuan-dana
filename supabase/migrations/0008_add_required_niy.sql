-- Kolom NIY bersifat opsional. NIY hanya ditampilkan pada lembar tanda tangan.
alter table public.profiles add column if not exists niy text;
alter table public.fund_requests add column if not exists requester_niy text;
alter table public.approval_stages add column if not exists person_niy text;

-- Isi NIY pada data pengajuan jika tersedia, tanpa mewajibkannya.
create or replace function public.set_requester_niy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select nullif(trim(niy), '') into new.requester_niy
  from public.profiles where id = new.requester_id;
  return new;
end;
$$;

drop trigger if exists trg_set_requester_niy on public.fund_requests;
create trigger trg_set_requester_niy
before insert on public.fund_requests
for each row execute function public.set_requester_niy();

create or replace function public.set_stage_person_niy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.step = 1 then
    select nullif(trim(niy), '') into new.person_niy
    from public.profiles
    where id = (select requester_id from public.fund_requests where id = new.request_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_stage_person_niy on public.approval_stages;
create trigger trg_set_stage_person_niy
before insert on public.approval_stages
for each row execute function public.set_stage_person_niy();
