-- Server-owned access control for FABTrades Pro.
--
-- A purchase is one way to *acquire* access; access itself is a row here, keyed by
-- Supabase user. That indirection is what lets somebody buy on iOS and have Pro on
-- Android and the web, and it is why both clients read the same table rather than
-- each asking its own store.
--
-- Every column below is written only by the service role, from the RevenueCat
-- webhook. Clients can read their own row and nothing else: a client that could
-- write `is_active` could grant itself Pro, so no insert, update, or delete policy
-- exists at all.

-- ---------------------------------------------------------------------------
-- Current state
-- ---------------------------------------------------------------------------

-- One row per user, holding *current* state rather than a history of events.
--
-- That is deliberate. Store events arrive out of order and mean less than they
-- appear to — a refund arrives as a CANCELLATION, a billing failure looks like an
-- expiry until it recovers — so folding a stream of them into a boolean drifts.
-- The webhook instead re-reads the customer's whole state from RevenueCat and
-- overwrites this row, which is idempotent and cannot drift.
CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),

  -- What gating reads. True through a grace period, because somebody whose card
  -- failed this morning has not stopped being a subscriber.
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_trialing BOOLEAN NOT NULL DEFAULT FALSE,
  in_grace_period BOOLEAN NOT NULL DEFAULT FALSE,

  -- Where the access came from. `promo` covers RevenueCat promotional grants, which
  -- is how support comps somebody without a store transaction.
  source TEXT CHECK (source IN ('app_store', 'play_store', 'stripe', 'promo')),
  product_id TEXT,
  expires_at TIMESTAMPTZ,

  -- Sandbox purchases are indistinguishable from real ones in every field above.
  -- Recorded so that a test purchase landing in production is visible rather than
  -- being mistaken for revenue — and so it can be cleaned up.
  is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,

  -- RevenueCat's own customer id, which is not always the app_user_id we sent:
  -- aliasing merges customers, and support tickets are answered against this.
  rc_customer_id TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlement" ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Drives the nightly reconciliation sweep, which asks for everything expiring
-- around now. Partial, because free users are the majority and never qualify.
CREATE INDEX IF NOT EXISTS entitlements_expires_at_idx
  ON public.entitlements(expires_at)
  WHERE is_active;

-- ---------------------------------------------------------------------------
-- Event log
-- ---------------------------------------------------------------------------

-- The webhook's idempotency key and its audit trail, in one table.
--
-- `id` is the provider's event id, so a redelivery collides and is recognised as a
-- replay. RevenueCat retries aggressively and duplicates are normal, not
-- exceptional.
--
-- The raw payload is kept because a disputed charge is argued from what the
-- provider actually said, and because the mapping into `entitlements` is lossy by
-- design — this is the only place the discarded detail survives.
CREATE TABLE IF NOT EXISTS public.billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'revenuecat',

  -- Nullable and unconstrained on purpose. An event can name an app_user_id that is
  -- not a Supabase user: an anonymous RevenueCat id from before sign-in, or a
  -- deleted account. A foreign key would reject exactly the events worth keeping,
  -- since an event that cannot be stored cannot be recognised as a replay either.
  app_user_id UUID,

  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- No policies at all: enabling RLS without any leaves the table reachable only by
-- the service role. Nobody's purchase history is any client's business, including
-- their own — the state they need is in `entitlements`.

CREATE INDEX IF NOT EXISTS billing_events_app_user_id_received_at_idx
  ON public.billing_events(app_user_id, received_at DESC);
