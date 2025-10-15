# Discord Authentication Setup Guide

This guide will help you set up Discord OAuth authentication with Supabase for the FAB Trades application.

## Prerequisites

- A Discord account
- Access to create a Supabase account (free tier is sufficient)

## Step 1: Create Discord OAuth Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "FAB Trades")
4. Click "Create"
5. Navigate to the "OAuth2" section in the left sidebar
6. Copy the **Client ID** and **Client Secret** (you'll need these for Supabase)
7. Under "Redirects", you'll add the Supabase callback URL later (Step 3)

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: FAB Trades (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose the closest to your users
4. Click "Create new project"
5. Wait for the project to finish setting up (1-2 minutes)

## Step 3: Configure Discord OAuth in Supabase

1. In your Supabase project dashboard, go to **Authentication** > **Providers**
2. Find "Discord" in the list and enable it
3. Enter your Discord OAuth credentials:
   - **Client ID**: From Discord Developer Portal (Step 1)
   - **Client Secret**: From Discord Developer Portal (Step 1)
4. Copy the **Callback URL** shown (it will look like: `https://[your-project-ref].supabase.co/auth/v1/callback`)
5. Go back to the Discord Developer Portal > OAuth2 section
6. Add the Supabase callback URL to the "Redirects" list
7. Click "Save Changes" in Discord Developer Portal
8. Click "Save" in Supabase

## Step 4: Set Up Database Schema

1. In Supabase, go to the **SQL Editor**
2. Click "New Query"
3. Copy and paste the following SQL:

```sql
-- Create trades table
CREATE TABLE trades (
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

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX trades_user_id_created_at_idx ON trades(user_id, created_at DESC);
```

4. Click "Run" to execute the SQL
5. Verify success in the output panel

## Step 5: Get Supabase API Credentials

1. In Supabase, go to **Project Settings** (gear icon) > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 6: Configure Environment Variables

1. In your project root, create a `.env` file (or `.env.local` if using Vite)
2. Add the following variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace the values with your actual Supabase Project URL and anon key from Step 5
4. Save the file

**Important:** Make sure `.env` is in your `.gitignore` file to avoid committing secrets!

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser

3. Click the "Sign in with Discord" button in the header

4. You should be redirected to Discord for authorization

5. After authorizing, you'll be redirected back to your app

6. You should see your Discord username and avatar in the header

7. Try saving a trade:
   - Add some cards to the trade
   - Click "Save Trade"
   - Give it a name and save
   - Click "Load History" to verify the trade was saved

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

