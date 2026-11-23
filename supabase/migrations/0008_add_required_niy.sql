-- NIY wajib untuk semua akun dan disimpan pada lembar pengajuan.
-- Jalankan melalui Supabase Dashboard > SQL Editor setelah deploy frontend.

alter table public.profiles add column if not exists niy text;
alter table public.fund_requests add column if not exists requester_niy text;
alter table public.approval_stages add column if not exists person_niy text;

-- Isi NIY pengaju secara aman dari profil database, bukan dari data kiriman browser.
create or replace function public.set_requester_niy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_niy text;
begin
  select nullif(trim(niy), '') into v_niy
  from public.profiles where id = new.requester_id;

  if v_niy is null then
    raise exception 'NIY akun Anda belum diisi. Hubungi Direktur untuk melengkapi NIY sebelum membuat pengajuan.';
  end if;

  new.requester_niy := v_niy;
  return new;
end;
$$;

drop trigger if exists trg_set_requester_niy on public.fund_requests;
create trigger trg_set_requester_niy
before insert on public.fund_requests
for each row execute function public.set_requester_niy();

-- Pada tahap 1, ambil NIY pengaju dari profil. Tahap pemeriksa tetap boleh kosong.
create or replace function public.set_stage_person_niy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_niy text;
begin
  if new.step = 1 then
    select nullif(trim(niy), '') into v_niy
    from public.profiles
    where id = (select requester_id from public.fund_requests where id = new.request_id);

    if v_niy is null then
      raise exception 'NIY pengaju belum terdaftar.';
    end if;
    new.person_niy := v_niy;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_stage_person_niy on public.approval_stages;
create trigger trg_set_stage_person_niy
before insert on public.approval_stages
for each row execute function public.set_stage_person_niy();
