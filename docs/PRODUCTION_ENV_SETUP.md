# Production Environment Variables Setup

## Environment Variables Needed

Your app requires these environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Platform-Specific Instructions

### Vercel (Recommended for React/Vite)

1. **Via Dashboard:**
   - Go to your project settings
   - Navigate to **Settings** > **Environment Variables**
   - Add both variables:
     - Name: `VITE_SUPABASE_URL`
     - Value: Your Supabase URL
     - Environment: Production (and Preview if needed)
   - Click "Save"
   - **Important:** Redeploy after adding variables

2. **Via CLI:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

3. **Trigger Redeploy:**
   ```bash
   vercel --prod
   ```

### Netlify

1. **Via Dashboard:**
   - Go to **Site settings** > **Environment variables**
   - Click "Add a variable"
   - Add both variables:
     - Key: `VITE_SUPABASE_URL`
     - Value: Your Supabase URL
     - Scope: Deploys, Deploy Previews (as needed)
   - Click "Save"
   - Go to **Deploys** > **Trigger deploy** > **Clear cache and deploy site**

2. **Via netlify.toml:**
   ```toml
   [build.environment]
     VITE_SUPABASE_URL = "https://your-project.supabase.co"
     VITE_SUPABASE_ANON_KEY = "your-anon-key-here"
   ```
   ⚠️ **NOT RECOMMENDED** - Exposes secrets in repository

3. **Via CLI:**
   ```bash
   netlify env:set VITE_SUPABASE_URL "your-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
   ```

### GitHub Pages

GitHub Pages doesn't support environment variables directly. You have two options:

**Option 1: Use GitHub Actions with Secrets**

1. Add secrets to repository:
   - Go to **Settings** > **Secrets and variables** > **Actions**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             
         - name: Install and Build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
           run: |
             npm ci
             npm run build
             
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

**Option 2: Build Locally**
- Build with env vars on your machine
- Push the `dist` folder to `gh-pages` branch

### Cloudflare Pages

1. **Via Dashboard:**
   - Go to **Workers & Pages** > Your project
   - Click **Settings** > **Environment variables**
   - Add both variables for Production
   - Redeploy the project

2. **Via Wrangler CLI:**
   ```bash
   wrangler pages secret put VITE_SUPABASE_URL
   wrangler pages secret put VITE_SUPABASE_ANON_KEY
   ```

### Railway

1. **Via Dashboard:**
   - Select your project
   - Go to **Variables** tab
   - Click **+ New Variable**
   - Add both variables
   - Railway auto-redeploys

2. **Via CLI:**
   ```bash
   railway variables set VITE_SUPABASE_URL=your-url
   railway variables set VITE_SUPABASE_ANON_KEY=your-key
   ```

### Render

1. **Via Dashboard:**
   - Go to your web service
   - Navigate to **Environment** tab
   - Click **Add Environment Variable**
   - Add both variables
   - Click **Save Changes** (auto-redeploys)

### AWS Amplify

1. **Via Console:**
   - Open your app in Amplify Console
   - Go to **App settings** > **Environment variables**
   - Add both variables
   - Redeploy from **App settings** > **General**

## Important Notes

### ⚠️ Vite Environment Variables

**CRITICAL:** Vite environment variables MUST:
1. Start with `VITE_` prefix to be exposed to the client
2. Be set BEFORE build time (not runtime)
3. Be rebuilt after adding/changing variables

### 🔒 Security

The Supabase anon key is **safe to expose** in client-side code because:
- It's designed for public use
- All security is enforced by Row Level Security (RLS) in the database
- Users can only access their own data (enforced server-side)

However, NEVER expose:
- Supabase service role key
- Database passwords
- Private API keys

### 🔄 After Adding Variables

**You MUST redeploy/rebuild** for changes to take effect:

```bash
# Local test first
npm run build
npm run preview

# Then deploy
git push  # (triggers auto-deploy on most platforms)
# OR
vercel --prod  # (manual deploy)
```

## Verification

### Check if variables are set in build:

1. **View source of deployed site**
2. **Open browser DevTools > Console**
3. **Run:**
   ```javascript
   // This will work in dev but should be compiled in production
   console.log(import.meta.env.VITE_SUPABASE_URL);
   ```

If it shows `undefined`, the variables weren't available during build.

### Test the app:

1. Try to sign in with Discord
2. Check browser console for Supabase errors
3. If you see "Authentication not configured" - variables aren't set

## Common Issues

### Variables not working?

**Check:**
1. ✅ Variable names have `VITE_` prefix
2. ✅ Spelled exactly correct (case-sensitive)
3. ✅ Site was redeployed AFTER adding variables
4. ✅ Build cache was cleared
5. ✅ No trailing spaces in values

### Still blank screen?

1. Check browser console for errors (F12)
2. Verify build succeeded in deployment logs
3. Try clearing browser cache (Ctrl+Shift+R)
4. Check deployment platform logs

## Quick Setup Guide

### For Vercel (Easiest):

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project (run in project directory)
vercel link

# 4. Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted

# 5. Deploy
vercel --prod
```

### For Netlify:

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Link project
netlify link

# 4. Add environment variables
netlify env:set VITE_SUPABASE_URL "your-url-here"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key-here"

# 5. Deploy
netlify deploy --prod
```

## Need Help?

If you're still having issues:
1. Check which platform you're using
2. Verify your Supabase credentials are correct
3. Look at deployment logs for build errors
4. Check browser console for runtime errors

