-- Account deletion needs auth.users rows to cascade into public.trades.
-- The original trades FK omitted ON DELETE CASCADE; every other user-owned
-- table already has it. Without this, auth.admin.deleteUser fails with a
-- foreign-key violation whenever the customer has saved a trade.

ALTER TABLE public.trades
  DROP CONSTRAINT trades_user_id_fkey;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
