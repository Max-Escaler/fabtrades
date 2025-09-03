# Automatic CSV Updates for Netlify Deployment

This project is configured to automatically download CSV files daily at 21:00 UTC using GitHub Actions, which triggers Netlify deployments when new data is available.

## How It Works

1. **GitHub Actions Workflow**: Located at `.github/workflows/csv-download.yml`
2. **Schedule**: Runs daily at 21:00 UTC (9:00 PM UTC)
3. **Process**: Downloads CSVs → Checks for changes → Commits updates → Triggers Netlify deployment
4. **Manual Trigger**: Can be run manually from GitHub Actions tab

## Workflow Steps

1. **Checkout**: Gets the latest code from your repository
2. **Setup Node.js**: Installs Node.js 18 with npm caching
3. **Install Dependencies**: Runs `npm ci` for fast, reliable installs
4. **Download CSVs**: Runs `npm run download-csvs` to fetch latest data
5. **Check Changes**: Determines if any CSV files were updated
6. **Commit & Push**: If changes exist, commits them and pushes to trigger Netlify
7. **Log Completion**: Records the workflow results

## Benefits for Netlify

- ✅ **Automatic Deployments**: New CSV data triggers fresh Netlify builds
- ✅ **Cloud-based**: No dependency on local machine being online
- ✅ **Version Control**: All CSV changes are tracked in git history
- ✅ **Free**: Uses GitHub Actions free tier (2,000 minutes/month)
- ✅ **Reliable**: Runs in GitHub's cloud infrastructure

## Monitoring

### Check Workflow Status
1. Go to your GitHub repository
2. Click "Actions" tab
3. Look for "Daily CSV Download" workflow
4. View recent runs and their status

### Manual Trigger
1. Go to GitHub repository → Actions tab
2. Click "Daily CSV Download" workflow
3. Click "Run workflow" button
4. Select branch and click "Run workflow"

### View CSV Status
```bash
npm run csv-status
```

### Check Last Update Time
The timestamp is displayed in the app header: "Prices last updated at: [timestamp]"

## Troubleshooting

### Workflow Fails
1. Check GitHub Actions logs for error details
2. Verify `npm run download-csvs` works locally
3. Ensure repository has proper permissions

### No Deployments Triggered
1. Check if CSV files actually changed
2. Verify Netlify is connected to your GitHub repository
3. Check Netlify build logs for any issues

### CSV Download Issues
1. Check network connectivity from GitHub Actions
2. Verify CSV URLs are still valid
3. Check for rate limiting from data sources

## Configuration

### Change Schedule
Edit `.github/workflows/csv-download.yml`:
```yaml
schedule:
  - cron: '0 21 * * *'  # Daily at 21:00 UTC
```

### Change Time Zone
The workflow runs in UTC. To change:
```yaml
schedule:
  - cron: '0 21 * * *'  # Adjust time as needed
```

### Add Notifications
Add to workflow for Slack/Discord/email notifications:
```yaml
- name: Notify on success
  if: success()
  run: |
    # Add notification logic here
```

## Files Involved

- `.github/workflows/csv-download.yml` - GitHub Actions workflow
- `scripts/downloadCSVs.js` - CSV download script
- `src/utils/csvDownloader.js` - CSV downloader utility
- `public/price-guide/` - Downloaded CSV files
- `public/csv-urls.csv` - List of CSV URLs to download

## Local Testing

Test the CSV download process locally:
```bash
# Download CSVs
npm run download-csvs

# Check status
npm run csv-status

# Force download all files
npm run download-csvs:force
```
