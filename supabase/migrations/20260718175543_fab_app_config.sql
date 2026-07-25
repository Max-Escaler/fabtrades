-- Soft/force app update config for the FAB Trades mobile client.
-- Single-row table; clients read latest_version and compare to PackageInfo.version.

CREATE TABLE IF NOT EXISTS public.fab_app_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_version text NOT NULL,
  min_version text,
  android_store_url text,
  ios_store_url text,
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fab_app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fab_app_config"
  ON public.fab_app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.fab_app_config FROM PUBLIC;
GRANT SELECT ON public.fab_app_config TO anon, authenticated;

INSERT INTO public.fab_app_config (
  id,
  latest_version,
  min_version,
  android_store_url,
  message
) VALUES (
  1,
  '1.0.1',
  NULL,
  'https://play.google.com/store/apps/details?id=fabtrades.myapp',
  'A newer version of FAB Trades is available. Update to get the latest sets, prices, and fixes.'
) ON CONFLICT (id) DO NOTHING;
