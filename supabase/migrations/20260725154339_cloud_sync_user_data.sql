-- Cloud sync for per-user collection data.
--
-- Until now every piece of user data lived only on the device that created it:
-- mobile kept the binder, lend groups, and settings in SharedPreferences, and only
-- web had any server-side storage (the `trades` table). These tables give both
-- clients one home for that data so a binder built on a phone shows up on the site.
--
-- Three conventions apply to every table here, and they exist to make an offline
-- client reconcilable rather than merely writable:
--
--   * `updated_at` is supplied by the client, not stamped by the server. Merge is
--     last-write-wins on that value, so a server-side `now()` would erase the only
--     information the merge depends on.
--   * `deleted_at` marks a tombstone instead of removing the row. A hard delete is
--     indistinguishable from "never seen", so the other device would resurrect it
--     on its next push.
--   * `client_id` is the stable identifier minted by whichever client created the
--     record, unique per user. Server `id` values cannot serve this purpose because
--     a record exists locally, and may be edited and deleted, before it has ever
--     reached the server.
--
-- Tombstones are not pruned here. They are small, and deciding when it is safe to
-- drop one requires knowing that every device has synced past it, which nothing in
-- this schema tracks.

-- ---------------------------------------------------------------------------
-- Binder and want list
-- ---------------------------------------------------------------------------

-- No `client_id`: a binder entry is identified by which printing it is and which
-- list it sits on, so two devices adding the same card converge on one row rather
-- than racing to create two. `condition` and `quantity` are attributes of that
-- entry, not part of its identity — matching how the mobile binder merges.
CREATE TABLE IF NOT EXISTS public.binder_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  is_wanted BOOLEAN NOT NULL DEFAULT FALSE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition TEXT NOT NULL DEFAULT 'NM',
  -- A denormalized card stub (name, set, image, last-known prices) so a client can
  -- render a binder before the catalog has loaded, and can still show a printing
  -- that has since been removed from the catalog.
  card JSONB NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, card_id, is_wanted)
);

ALTER TABLE public.binder_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own binder entries" ON public.binder_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own binder entries" ON public.binder_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own binder entries" ON public.binder_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own binder entries" ON public.binder_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Supports the incremental pull: "everything of mine that changed since X".
CREATE INDEX IF NOT EXISTS binder_entries_user_id_updated_at_idx
  ON public.binder_entries(user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Lend / borrow groups
-- ---------------------------------------------------------------------------

-- `items` stays a JSONB array rather than becoming its own table. A group's items
-- are only ever read and written as a whole — there is no screen that edits one
-- item in isolation — so splitting them would add a join and a second merge
-- granularity without buying anything.
CREATE TABLE IF NOT EXISTS public.lend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  person_name TEXT,
  is_borrowing BOOLEAN NOT NULL DEFAULT FALSE,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, client_id)
);

ALTER TABLE public.lend_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lend groups" ON public.lend_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lend groups" ON public.lend_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lend groups" ON public.lend_groups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lend groups" ON public.lend_groups
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lend_groups_user_id_updated_at_idx
  ON public.lend_groups(user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- User settings
-- ---------------------------------------------------------------------------

-- One row per user, so `user_id` is the primary key and there is nothing to merge
-- beyond last-write-wins on the row. Columns are explicit rather than a JSONB blob
-- because the set is small, fixed, and worth validating: a typo in a price source
-- should fail at the database rather than silently fall back on every client.
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  price_source TEXT NOT NULL DEFAULT 'tcgplayer'
    CHECK (price_source IN ('tcgplayer', 'cardmarket')),
  theme_mode TEXT NOT NULL DEFAULT 'dark'
    CHECK (theme_mode IN ('light', 'dark')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No delete policy. Settings have defaults, so "reset" is an update; deleting the
-- row would only make the next read indistinguishable from a first-time user.

-- ---------------------------------------------------------------------------
-- Generalize `trades` so both clients can use it
-- ---------------------------------------------------------------------------

-- The table was built for web, where every trade is deliberately named and saved.
-- Mobile saves a trade as a side effect of confirming one, so it has no name, but
-- it does have notes, cash on either side, and a currency. These columns close that
-- gap; web ignores the ones it does not set.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS have_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS want_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT '$',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Existing web rows predate `client_id`, and their server id is already stable and
-- unique, so it serves as their client id.
UPDATE public.trades SET client_id = id::TEXT WHERE client_id IS NULL;

ALTER TABLE public.trades ALTER COLUMN client_id SET NOT NULL;

-- Mobile trades are unnamed: they are identified by date and contents, the way the
-- trade history screen lists them.
ALTER TABLE public.trades ALTER COLUMN name DROP NOT NULL;

-- `updated_at` already existed but was nullable with a default, and web only ever
-- set it explicitly on update. Sync depends on it always being present.
UPDATE public.trades SET updated_at = COALESCE(updated_at, created_at, NOW())
  WHERE updated_at IS NULL;

ALTER TABLE public.trades
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS trades_user_id_client_id_key
  ON public.trades(user_id, client_id);

CREATE INDEX IF NOT EXISTS trades_user_id_updated_at_idx
  ON public.trades(user_id, updated_at DESC);
