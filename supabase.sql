-- Ball of Duty: database-opzet voor Supabase.
-- Plak dit in Supabase > SQL Editor en klik Run.

create table if not exists public.opgaves (
  match int not null,
  player text not null,
  status text not null default '' check (status in ('', 'ja', 'misschien', 'nee')),
  prefs text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (match, player)
);


create table if not exists public.opstelling (
  match int primary key,
  slots jsonb not null default '{}',
  updated_at timestamptz not null default now()
);


alter table public.opgaves enable row level security;
alter table public.opstelling enable row level security;

-- Iedereen met de app mag lezen; schrijven gaat alleen via de functies hieronder.
drop policy if exists "lezen" on public.opgaves;
create policy "lezen" on public.opgaves for select using (true);
drop policy if exists "lezen" on public.opstelling;
create policy "lezen" on public.opstelling for select using (true);






-- Expliciete rechten (werkt ook als 'Automatically expose new tables' uit staat)
grant usage on schema public to anon;
grant select on public.opgaves, public.opstelling to anon;


-- Live bijwerken in de app
do $$ begin
  alter publication supabase_realtime add table public.opgaves;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.opstelling;
exception when duplicate_object then null; end $$;

-- Daarna: draai supabase-spelerscodes.sql voor de persoonlijke codes en de functies.
