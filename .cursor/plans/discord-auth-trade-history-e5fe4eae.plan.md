<!-- e5fe4eae-4cdc-4609-9c64-274b5a1b4e4f 6021f01c-9940-496c-bb62-00e4fdce49ac -->
# Discord Authentication & Trade History Implementation

## Overview

Add Discord OAuth authentication via Supabase to enable users to save and view their personal trade history. All trades remain private to the owner.

## Architecture Changes

### 1. Supabase Setup (External)

**Manual setup required before implementation:**

- Create free Supabase project at supabase.com
- Enable Discord OAuth provider in Authentication settings
  - Requires Discord OAuth app credentials (from Discord Developer Portal)
  - Set redirect URL to: `https://[project-ref].supabase.co/auth/v1/callback`
- Create database schema:
  ```sql
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

- Get project URL and anon key from Project Settings > API

### 2. Frontend Implementation

#### Dependencies

Add to `package.json`:

- `@supabase/supabase-js` - Supabase client library

#### New Files to Create

**`src/lib/supabase.js`**

- Initialize Supabase client with project URL and anon key
- Export singleton client instance

**`src/contexts/AuthContext.jsx`**

- Create React context for authentication state
- Manage user session (user object, loading state)
- Provide auth methods:
  - `signInWithDiscord()` - Initiate Discord OAuth flow
  - `signOut()` - Clear session
  - `session` - Current session data
  - `user` - Current user object
  - `loading` - Auth loading state

**`src/services/tradeHistory.js`**

- `saveTradeToHistory(name, haveList, wantList, totals)` - Save trade to database
- `getUserTrades()` - Fetch all user's trades (sorted by created_at DESC)
- `getTradeById(id)` - Fetch specific trade
- `updateTrade(id, data)` - Update existing trade
- `deleteTrade(id)` - Delete trade from history
- All functions check auth state and return appropriate errors

**`src/components/auth/LoginButton.jsx`**

- Display user avatar + username when logged in
- Show "Sign in with Discord" button when logged out
- Dropdown menu with "View History" and "Sign Out" options
- Use MUI Button and Menu components

**`src/components/history/TradeHistoryModal.jsx`**

- Modal dialog showing list of saved trades
- Each trade shows: name, date, totals, diff indicator
- Actions: Load trade, Delete trade
- Empty state when no trades exist
- Loading and error states

**`src/components/history/SaveTradeDialog.jsx`**

- Simple dialog to name a trade before saving
- Text field for trade name
- Save/Cancel buttons
- Validation for empty names

#### Modified Files

**`src/App.jsx`**

- Wrap routes with `<AuthProvider>`
- Handle OAuth callback on page load (Supabase handles automatically)

**`src/main.jsx`**

- Ensure AuthProvider wraps the entire app

**`src/components/elements/TradeSummary.jsx`**

- Add "Save Trade" button (only visible when authenticated)
- Add "Load from History" button (only visible when authenticated)
- Wire up save/load functionality
- Show indication if current trade was loaded from history

**`src/components/elements/Header.jsx`**

- Add `<LoginButton />` component to header (top right)
- Adjust header layout to accommodate auth button

**`src/hooks/useTradeState.js`**

- Add optional `loadTradeFromHistory(trade)` function
- Function replaces current haveList/wantList with loaded trade data
- Clear URL data when loading from history

### 3. User Flow

**Authentication Flow:**

1. User clicks "Sign in with Discord" button
2. Redirected to Discord OAuth consent screen
3. After approval, redirected back to app (Supabase handles tokens)
4. AuthContext updates with user session
5. UI updates to show logged-in state

**Save Trade Flow:**

1. User builds a trade (has cards in have/want lists)
2. Clicks "Save Trade" button in TradeSummary
3. SaveTradeDialog opens asking for a name
4. On submit, trade saved to database with current user_id
5. Success toast/feedback shown

**Load Trade Flow:**

1. User clicks "View History" from LoginButton menu
2. TradeHistoryModal opens showing all saved trades
3. User clicks "Load" on a trade
4. Trade data populates have/want lists
5. Modal closes, user can edit/share the loaded trade

**Trade History Management:**

1. Users can delete trades from history modal
2. Trades show creation date and basic stats
3. No limit on number of saved trades (can add later if needed)

### 4. Security Considerations

- All database access controlled by Row Level Security (RLS)
- Users can ONLY access their own trades
- Supabase handles OAuth token management securely
- No API keys exposed in client code (using anon key which is safe)
- All mutations require authenticated user

### 5. UI/UX Enhancements

**Header:**

- Login button in top-right corner with Discord branding
- User avatar thumbnail when logged in

**TradeSummary:**

- "Save Trade" icon button with tooltip
- "Load from History" icon button with tooltip
- Buttons disabled when not authenticated (with tooltip explaining why)

**TradeHistoryModal:**

- Sortable table/list view of trades
- Search/filter trades by name
- Formatted dates (e.g., "2 days ago")
- Visual diff indicator (color-coded: red for deficit, green for surplus)

### 6. Testing Considerations

- Mock Supabase client in tests
- Test auth context provider
- Test trade save/load functionality
- Test RLS policies in Supabase dashboard
- Manual testing of OAuth flow

## Implementation Order

1. Setup Supabase project and database schema
2. Install dependencies and create Supabase client
3. Create AuthContext and provider
4. Create LoginButton component and add to Header
5. Create trade history service functions
6. Create SaveTradeDialog component
7. Create TradeHistoryModal component
8. Integrate save/load functionality into TradeSummary and useTradeState
9. Test authentication flow end-to-end
10. Test trade save/load flow end-to-end
11. Polish UI/UX and add loading states

### To-dos

- [ ] Create Supabase project, configure Discord OAuth, and set up database schema with RLS policies
- [ ] Install @supabase/supabase-js package
- [ ] Create Supabase client (lib/supabase.js) and AuthContext provider
- [ ] Create LoginButton component and integrate into Header
- [ ] Create tradeHistory.js service with CRUD operations for trades
- [ ] Create SaveTradeDialog and integrate save functionality into TradeSummary
- [ ] Create TradeHistoryModal to display and manage saved trades
- [ ] Add loadTradeFromHistory function to useTradeState and wire up to UI
- [ ] Test authentication flow and trade save/load/delete operations end-to-end
- [ ] Add loading states, error handling, and UI polish throughout