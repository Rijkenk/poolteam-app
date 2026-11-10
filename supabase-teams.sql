-- Poolteam-app: database geschikt maken voor meerdere teams.
-- Plak dit in Supabase > SQL Editor en klik Run. Alles van Ball of Duty blijft staan (team 'ballofduty').
-- Onderaan zie je daarna de codes van de nieuwe spelers.

-- 1. Teamkolom erbij
alter table public.opgaves    add column if not exists team text not null default 'ballofduty';
alter table public.opstelling add column if not exists team text not null default 'ballofduty';
alter table public.spelers    add column if not exists team text not null default 'ballofduty';

alter table public.opgaves    drop constraint if exists opgaves_pkey;
alter table public.opgaves    add primary key (team, match, player);
alter table public.opstelling drop constraint if exists opstelling_pkey;
alter table public.opstelling add primary key (team, match);
alter table public.spelers    drop constraint if exists spelers_pkey;
alter table public.spelers    add primary key (team, player);

-- 2. Spelers van Witchcraft (captain Roland mag de opstelling maken)
insert into public.spelers (team, player, naam, code, is_admin) values
  ('witchcraft', '1160908', 'Roland Zwolsman',       upper(substr(md5(random()::text), 1, 6)), true),
  ('witchcraft', '1160764', 'Jeroen Van Valkenhoef', upper(substr(md5(random()::text), 1, 6)), false),
  ('witchcraft', '1160896', 'Robère de Groot',       upper(substr(md5(random()::text), 1, 6)), false),
  ('witchcraft', '1160910', 'Imre Florijn',          upper(substr(md5(random()::text), 1, 6)), false)
on conflict (team, player) do nothing;

-- 3. Functies met team
create or replace function public.check_player_t(p_team text, p_player text, p_code text) returns text
language sql security definer set search_path = public as $$
  select case when is_admin then 'admin' else 'speler' end
  from spelers where team = p_team and player = p_player and upper(code) = upper(trim(p_code));
$$;

create or replace function public.set_opgave_t(p_team text, p_code text, p_match int, p_player text, p_status text, p_prefs text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from spelers where team = p_team and upper(code) = upper(trim(p_code)) and (player = p_player or is_admin)) then
    raise exception 'bad_code';
  end if;
  if not exists (select 1 from spelers where team = p_team and player = p_player) then
    raise exception 'bad_player';
  end if;
  insert into opgaves (team, match, player, status, prefs, updated_at)
  values (p_team, p_match, p_player, coalesce(p_status, ''), coalesce(p_prefs, '{}'), now())
  on conflict (team, match, player) do update
    set status = excluded.status, prefs = excluded.prefs, updated_at = now();
end $$;

create or replace function public.set_opstelling_t(p_team text, p_code text, p_match int, p_slots jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from spelers where team = p_team and upper(code) = upper(trim(p_code)) and is_admin) then
    raise exception 'bad_code';
  end if;
  insert into opstelling (team, match, slots, updated_at) values (p_team, p_match, coalesce(p_slots, '{}'), now())
  on conflict (team, match) do update set slots = excluded.slots, updated_at = now();
end $$;

grant execute on function public.check_player_t(text, text, text) to anon;
grant execute on function public.set_opgave_t(text, text, int, text, text, text[]) to anon;
grant execute on function public.set_opstelling_t(text, text, int, jsonb) to anon;

-- 4. De oude functies blijven werken voor de huidige Ball of Duty-app (rijkenk.github.io/ball-of-duty)
create or replace function public.check_player(p_player text, p_code text) returns text
language sql security definer set search_path = public as $$ select public.check_player_t('ballofduty', p_player, p_code); $$;
create or replace function public.set_opgave(p_code text, p_match int, p_player text, p_status text, p_prefs text[])
returns void language sql security definer set search_path = public as $$ select public.set_opgave_t('ballofduty', p_code, p_match, p_player, p_status, p_prefs); $$;
create or replace function public.set_opstelling(p_code text, p_match int, p_slots jsonb)
returns void language sql security definer set search_path = public as $$ select public.set_opstelling_t('ballofduty', p_code, p_match, p_slots); $$;

-- De codes van Witchcraft om door te geven:
select naam, code, case when is_admin then 'mag opstelling maken' else '' end as rechten
from public.spelers where team = 'witchcraft' order by is_admin desc, naam;
