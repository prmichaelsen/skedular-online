# Google Calendar OAuth Setup Guide

## Overview

Google Calendar integration is fully implemented in code. To enable it in production, you need to configure OAuth credentials in Google Cloud Console and set environment variables.

## Current Status

✅ **Implemented**:
- Provider-adapter pattern (`src/lib/calendar-providers/types.ts`)
- Google Calendar provider (`src/lib/calendar-providers/google.ts`)
- OAuth callback route (`src/routes/auth.google.callback.tsx`)
- Dashboard UI with Connect/Disconnect buttons
- Firestore schema for storing connections
- Token refresh infrastructure

❌ **Requires Manual Setup**:
- Google Cloud project creation
- OAuth 2.0 credentials configuration
- Environment variables in Cloudflare

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in required fields:
   - App name: `Skedular`
   - User support email: your email
   - Developer contact: your email
4. Add scope:
   - Click "Add or Remove Scopes"
   - Search for: `https://www.googleapis.com/auth/calendar.readonly`
   - Select and save
5. Add test users (for testing before verification)
6. Submit for verification (required for production)

### 3. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Web application**
4. Name: `Skedular Web Client`
5. Add **Authorized redirect URI**:
   ```
   https://skedular.online/auth/google/callback
   ```
   For local development, also add:
   ```
   http://localhost:3000/auth/google/callback
   ```
6. Click "Create"
7. **Save** the Client ID and Client Secret

### 4. Set Cloudflare Environment Variables

Add these secrets to your Cloudflare Workers environment:

```bash
# Via Cloudflare Dashboard:
# Workers & Pages → skedular → Settings → Environment Variables

GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

Or via `wrangler`:

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 5. Update wrangler.toml (if needed)

Ensure environment variables are accessible:

```toml
[vars]
# ... existing vars

# Note: Secrets (GOOGLE_CLIENT_*) are set via dashboard/wrangler, not here
```

## Testing

Once configured, test the OAuth flow:

1. Log in to Skedular dashboard
2. Open Settings panel
3. Click "Connect Google Calendar"
4. Verify redirect to Google consent screen
5. Check that scope is **calendar.readonly** (read-only)
6. Grant access
7. Verify successful connection in dashboard
8. Test disconnect/reconnect flow

## Security Notes

- **Read-only scope**: `calendar.readonly` prevents Skedular from modifying/deleting user events
- **CSRF protection**: OAuth state parameter validates against user session
- **Token storage**: OAuth tokens stored in Firestore with proper access controls
- **Automatic refresh**: Tokens refreshed proactively before expiry (requires cron job implementation)

## Rate Limiting

Google Calendar API quotas:
- FreeBusy queries: 1,000,000 requests/day
- Queries/second: 50 qps per user

Skedular implements:
- 5-minute cache for conflict checks
- Efficient batched FreeBusy queries (all calendars in single request)

## Next Steps

After OAuth setup is complete:

1. ✅ Test OAuth flow end-to-end
2. ⏳ Implement proactive token refresh cron job (Task 4, Step 6)
3. ⏳ Implement conflict checking integration (Task 5)
4. ⏳ Test with real bookings and Google Calendar events

## Troubleshooting

### "Invalid client" error
- Verify `GOOGLE_CLIENT_ID` matches the one from Google Cloud Console
- Check redirect URI is exactly: `https://skedular.online/auth/google/callback`

### "Access denied" error
- Ensure Google Calendar API is enabled
- Verify scope is added to OAuth consent screen

### Token refresh fails
- Check `GOOGLE_CLIENT_SECRET` is correct
- Verify user hasn't revoked access in Google Account settings

## References

- [Google OAuth 2.0 Web Server Flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [FreeBusy API Reference](https://developers.google.com/calendar/api/v3/reference/freebusy/query)
