-- FAB (Flesh and Blood) card & price schema, mirroring the Riftbound tables
-- but namespaced with a fab_ prefix so both games can share this project.

create table if not exists public.fab_sets (
  group_id bigint primary key,
  name text not null,
  set_number integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.fab_cards (
  id text primary key,
  product_id bigint not null,
  set_id bigint not null references public.fab_sets(group_id),
  unique_id text,
  name text not null,
  clean_name text,
  image_url text,
  tcgplayer_url text,
  sub_type_name text,
  is_foil boolean not null default false,
  rarity text,
  collector_number text,
  is_sealed boolean not null default false,
  cardmarket_id bigint,
  cardmarket_name text,
  -- FAB-specific card attributes (from TCGCSV extended fields)
  card_type text,
  card_sub_type text,
  card_class text,
  talent text,
  pitch text,
  cost text,
  power text,
  defense text,
  life text,
  intellect text,
  modified_on timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fab_cards_set_id_idx on public.fab_cards(set_id);
create index if not exists fab_cards_name_idx on public.fab_cards(name);
create index if not exists fab_cards_collector_number_idx on public.fab_cards(collector_number);

create table if not exists public.fab_card_prices (
  card_id text primary key references public.fab_cards(id),
  tcg_low numeric,
  tcg_mid numeric,
  tcg_high numeric,
  tcg_market numeric,
  tcg_direct_low numeric,
  cm_avg numeric,
  cm_low numeric,
  cm_trend numeric,
  cm_avg_foil numeric,
  cm_low_foil numeric,
  cm_trend_foil numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.fab_price_history (
  id bigint generated always as identity primary key,
  card_id text not null references public.fab_cards(id),
  captured_on date not null default current_date,
  tcg_market numeric,
  tcg_low numeric,
  cm_trend numeric,
  cm_low numeric,
  unique (card_id, captured_on)
);
create index if not exists fab_price_history_card_id_idx on public.fab_price_history(card_id);

create table if not exists public.fab_pipeline_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  total_sets integer,
  total_cards integer,
  cardmarket_matched integer,
  notes text
);

create or replace view public.fab_cards_with_prices as
select
  c.id, c.product_id, c.set_id, c.unique_id, c.name, c.clean_name,
  c.image_url, c.tcgplayer_url, c.sub_type_name, c.is_foil, c.rarity,
  c.collector_number, c.is_sealed, c.cardmarket_id, c.cardmarket_name,
  c.card_type, c.card_sub_type, c.card_class, c.talent, c.pitch,
  c.cost, c.power, c.defense, c.life, c.intellect,
  c.modified_on,
  s.name as set_name,
  p.tcg_low, p.tcg_mid, p.tcg_high, p.tcg_market, p.tcg_direct_low,
  p.cm_avg, p.cm_low, p.cm_trend, p.cm_avg_foil, p.cm_low_foil, p.cm_trend_foil,
  p.updated_at as price_updated_at
from public.fab_cards c
join public.fab_sets s on s.group_id = c.set_id
left join public.fab_card_prices p on p.card_id = c.id;

alter table public.fab_sets enable row level security;
alter table public.fab_cards enable row level security;
alter table public.fab_card_prices enable row level security;
alter table public.fab_price_history enable row level security;
alter table public.fab_pipeline_runs enable row level security;

create policy "Public read fab_sets" on public.fab_sets for select to anon, authenticated using (true);
create policy "Public read fab_cards" on public.fab_cards for select to anon, authenticated using (true);
create policy "Public read fab_card_prices" on public.fab_card_prices for select to anon, authenticated using (true);
create policy "Public read fab_price_history" on public.fab_price_history for select to anon, authenticated using (true);

grant select on public.fab_sets, public.fab_cards, public.fab_card_prices, public.fab_price_history to anon, authenticated;
grant select on public.fab_cards_with_prices to anon, authenticated;
