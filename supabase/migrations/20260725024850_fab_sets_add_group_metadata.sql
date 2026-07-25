ALTER TABLE public.fab_sets
  ADD COLUMN IF NOT EXISTS abbreviation text,
  ADD COLUMN IF NOT EXISTS published_on timestamptz,
  ADD COLUMN IF NOT EXISTS is_supplemental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modified_on timestamptz;
