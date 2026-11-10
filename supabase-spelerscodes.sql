-- Ball of Duty: persoonlijke codes per speler (vervangt teamcode en beheercode).
-- Plak dit in Supabase > SQL Editor en klik Run. Onderaan zie je daarna de codes per speler.

create table if not exists public.spelers (
  player text primary key,          -- CueScore-speler-id
  naam text not null,
  code text not null,
  is_admin boolean not null default false
);
alter table public.spelers enable row level security;
revoke all on public.spelers from anon, authenticated;   -- niemand kan codes uitlezen via de app

insert into public.spelers (player, naam, code, is_admin) values
  ('1162921',  'Kenneth Rijken',        upper(substr(md5(random()::text), 1, 6)), true),
  ('62677414', 'Laura Gielen',          upper(substr(md5(random()::text), 1, 6)), true),
  ('1185404',  'Vincent Bos',           upper(substr(md5(random()::text), 1, 6)), false),
  ('18284026', 'Roel Körndörffer',      upper(substr(md5(random()::text), 1, 6)), false),
  ('48336892', 'Patrick Chirco',        upper(substr(md5(random()::text), 1, 6)), false),
  ('62678155', 'Marco Oude Middendorp', upper(substr(md5(random()::text), 1, 6)), false),
  ('65125873', 'Stefan van der Blij',   upper(substr(md5(random()::text), 1, 6)), false),
  ('78493855', 'Ross Jelsma',           upper(substr(md5(random()::text), 1, 6)), false)
on conflict (player) do nothing;

-- Wie ben je? Geeft 'admin', 'speler' of null terug.
create or replace function public.check_player(p_player text, p_code text) returns text
language sql security definer set search_path = public as $$
  select case when is_admin then 'admin' else 'speler' end
  from spelers where player = p_player and upper(code) = upper(trim(p_code));
$$;

-- Opgave: alleen voor jezelf (de captain en Kenneth mogen ook voor anderen).
create or replace function public.set_opgave(p_code text, p_match int, p_player text, p_status text, p_prefs text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from spelers where upper(code) = upper(trim(p_code)) and (player = p_player or is_admin)) then
    raise exception 'bad_code';
  end if;
  insert into opgaves (match, player, status, prefs, updated_at)
  values (p_match, p_player, coalesce(p_status, ''), coalesce(p_prefs, '{}'), now())
  on conflict (match, player) do update
    set status = excluded.status, prefs = excluded.prefs, updated_at = now();
end $$;

-- Opstelling: alleen captain en Kenneth.
create or replace function public.set_opstelling(p_code text, p_match int, p_slots jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from spelers where upper(code) = upper(trim(p_code)) and is_admin) then
    raise exception 'bad_code';
  end if;
  insert into opstelling (match, slots, updated_at) values (p_match, coalesce(p_slots, '{}'), now())
  on conflict (match) do update set slots = excluded.slots, updated_at = now();
end $$;

grant execute on function public.check_player(text, text) to anon;
grant execute on function public.set_opgave(text, int, text, text, text[]) to anon;
grant execute on function public.set_opstelling(text, int, jsonb) to anon;

-- Oude team- en beheercode opruimen
drop function if exists public.check_code(text);
drop function if exists public.check_admin(text);
drop table if exists public.team_secret;

-- De codes om aan iedereen door te geven:
select naam, code, case when is_admin then 'mag opstelling maken' else '' end as rechten
from public.spelers order by is_admin desc, naam;
