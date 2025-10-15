# Discord Auth Quick Start Checklist

A simple step-by-step checklist to get Discord authentication working.

## ☐ Prerequisites
- [ ] Discord account
- [ ] Supabase account (sign up at supabase.com)

## ☐ Step 1: Discord OAuth App (5 min)
1. [ ] Go to https://discord.com/developers/applications
2. [ ] Click "New Application"
3. [ ] Name it "FAB Trades" (or your preference)
4. [ ] Click "OAuth2" in sidebar
5. [ ] Copy **Client ID** (save for later)
6. [ ] Copy **Client Secret** (save for later)
7. [ ] Leave redirects empty for now (will add in Step 3)

## ☐ Step 2: Create Supabase Project (3 min)
1. [ ] Go to https://supabase.com
2. [ ] Click "New Project"
3. [ ] Fill in:
   - Name: FAB Trades
   - Database Password: (create strong password - save it!)
   - Region: (choose closest to you)
4. [ ] Click "Create new project"
5. [ ] Wait 1-2 minutes for setup to complete

## ☐ Step 3: Configure Discord in Supabase (3 min)
1. [ ] In Supabase: Go to Authentication > Providers
2. [ ] Find "Discord" and enable it
3. [ ] Paste Discord **Client ID** from Step 1
4. [ ] Paste Discord **Client Secret** from Step 1
5. [ ] Copy the **Callback URL** shown (looks like: https://xxx.supabase.co/auth/v1/callback)
6. [ ] Click "Save" in Supabase
7. [ ] Go back to Discord Developer Portal
8. [ ] Add the Callback URL to Redirects
9. [ ] Click "Save Changes" in Discord

## ☐ Step 4: Create Database Tables (2 min)
1. [ ] In Supabase: Go to SQL Editor
2. [ ] Click "New Query"
3. [ ] Copy SQL from `DISCORD_AUTH_SETUP.md` (Step 4)
4. [ ] Paste and click "Run"
5. [ ] Verify success message

## ☐ Step 5: Get API Credentials (1 min)
1. [ ] In Supabase: Go to Settings (gear icon) > API
2. [ ] Copy **Project URL**
3. [ ] Copy **anon public** key (under Project API keys)

## ☐ Step 6: Configure Environment (2 min)
1. [ ] Create `.env` file in project root
2. [ ] Add:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. [ ] Replace with your actual values from Step 5
4. [ ] Save file

## ☐ Step 7: Test It! (5 min)
1. [ ] Run `npm run dev`
2. [ ] Open http://localhost:5173
3. [ ] Click "Sign in with Discord"
4. [ ] Authorize on Discord
5. [ ] See your Discord username in header ✓
6. [ ] Add some cards to a trade
7. [ ] Click "Save Trade"
8. [ ] Name it and save
9. [ ] Click "Load History"
10. [ ] See your saved trade ✓

## ☐ Done! 🎉

Total time: ~20 minutes

## Troubleshooting

### Can't sign in?
- ✓ Check Discord Client ID/Secret are correct
- ✓ Check Callback URL is added in Discord
- ✓ Check environment variables are correct
- ✓ Restart dev server after adding .env

### Can't save trades?
- ✓ Check database tables were created
- ✓ Check browser console for errors
- ✓ Make sure you're signed in

### Still stuck?
Check `DISCORD_AUTH_SETUP.md` for detailed troubleshooting.

