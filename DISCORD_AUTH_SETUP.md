# Discord Authentication Setup Guide

FAB Trades web Discord auth uses the shared Supabase project **RiftTrades**
(`tenrvaghaspwdvnwvgrh`) — the same project as mobile/pipeline card data.

> **Migration note (2026-07):** The old `FABTrades` project (`fjepuubksgrwxjwkiewx`)
> is inactive. Auth + the `trades` table now live on RiftTrades. Local `.env` should
> point at `https://tenrvaghaspwdvnwvgrh.supabase.co`.

## Prerequisites

- A Discord account / existing Discord OAuth application for FAB Trades
- Access to the RiftTrades Supabase project

## Step 1: Discord OAuth Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Open the existing FAB Trades app (or create one)
3. Navigate to **OAuth2**
4. Copy the **Client ID** and **Client Secret**
5. Under **Redirects**, add exactly:
   ```
   https://tenrvaghaspwdvnwvgrh.supabase.co/auth/v1/callback
   ```
6. Remove the old `fjepuubksgrwxjwkiewx` callback if it is still listed
7. Save changes

## Step 2: Enable Discord on RiftTrades

1. Open [RiftTrades Auth Providers](https://supabase.com/dashboard/project/tenrvaghaspwdvnwvgrh/auth/providers)
2. Enable **Discord**
3. Paste the Discord **Client ID** and **Client Secret**
4. Save

Also set URL config under **Authentication → URL Configuration**:

| Setting | Value |
|--------|--------|
| Site URL | `https://fabtrades.net` |
| Additional Redirect URLs | `https://fabtrades.net/**`, `http://localhost:5173/**`, `http://localhost:5173` |

## Step 3: Database schema (`trades`)

The `trades` table + RLS policies are already applied on RiftTrades. If you need
to recreate them:

```sql
-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  have_list JSONB NOT NULL,
  want_list JSONB NOT NULL,
  have_total NUMERIC(10,2),
  want_total NUMERIC(10,2),
  diff NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS trades_user_id_created_at_idx
  ON public.trades(user_id, created_at DESC);
```

## Step 4: Environment variables

Copy `.env.example` → `.env` (already done for local if migrated):

```env
VITE_SUPABASE_URL=https://tenrvaghaspwdvnwvgrh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon or publishable key from Project Settings → API>
```

**Production (Netlify):** update the same two site env vars, then **Clear cache and
deploy**. Vite bakes these in at build time.

**Important:** Keep `.env` out of git (it is gitignored).

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser

3. Click the "Sign in with Discord" button in the header

4. You should be redirected to Discord for authorization

5. After authorizing, you'll be redirected back to your app

6. You should see your Discord username and avatar in the header

7. Open **Trade History** from the avatar menu to confirm authenticated API access works

## Troubleshooting

### "Invalid redirect URI" error
- Make sure the Supabase callback URL is added to Discord OAuth redirects
- Check that there are no extra spaces or typos in the URL

### "Failed to save trade" error
- Verify the database schema was created correctly
- Check the browser console for detailed error messages
- Ensure Row Level Security policies are set up correctly

### Authentication doesn't work
- Verify environment variables are set correctly
- Restart the development server after adding environment variables
- Check that the Supabase project URL and anon key are correct

### Trade history is empty
- Make sure you're signed in
- Check the browser console for errors
- Verify the database table was created in Supabase

## Security Notes

- The anon key is safe to expose in client-side code - it only allows operations permitted by Row Level Security policies
- Never commit your `.env` file to version control
- Row Level Security ensures users can only access their own trades
- All database operations are validated server-side by Supabase

## Next Steps

Once authentication is working:
- You can customize the Discord OAuth scopes if needed
- Add additional user metadata to the trades table
- Implement trade sharing between users (future enhancement)
- Add filters and search to trade history

## Support

For issues with:
- **Discord OAuth**: Check [Discord Developer Documentation](https://discord.com/developers/docs/topics/oauth2)
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **This App**: Check the project README or open an issue

