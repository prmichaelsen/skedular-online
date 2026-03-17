# Task 4: Google Calendar OAuth Connection Flow

**Milestone**: M2 — Calendar Sync
**Estimated Time**: 5-7 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Implement Google Calendar OAuth 2.0 connection flow with read-only permissions (`calendar.readonly` scope), token storage in Firestore, and proactive token refresh via Cloudflare Scheduled Tasks (cron job).

## Context

From the security-first calendar sync design (requirements.md):
- OAuth scope: `calendar.readonly` only (no write permissions)
- Prevents risk of skedular modifying/deleting user's calendar events
- OAuth setup via "Connect Google Calendar" button in settings
- Proactive token refresh before expiry via Cloudflare cron
- Graceful degradation when token revoked (show banner, skip conflict checking)
- Provider-adapter pattern for multi-provider extensibility

## Steps

### 1. Set Up Google Cloud Project

**Actions**:
- Create Google Cloud project at https://console.cloud.google.com
- Enable Google Calendar API
- Create OAuth 2.0 credentials (Web application)
- Add authorized redirect URI: `https://skedular.online/auth/google/callback`
- Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Cloudflare secrets

### 2. Create Provider Adapter Interface

**File**: `app/lib/calendar-providers/types.ts`

**Actions**:
- Define `CalendarProvider` interface:

```typescript
export interface CalendarProvider {
  name: string; // 'google', 'outlook', etc.

  // OAuth flow
  getAuthUrl(userId: string, redirectUri: string): string;
  handleCallback(code: string, userId: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  // Calendar operations
  checkConflicts(accessToken: string, timeRange: TimeRange): Promise<BusyWindow[]>;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  scope: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BusyWindow {
  start: Date;
  end: Date;
}
```

**Pattern Reference**: `tanstack-cloudflare.provider-adapter.md`

### 3. Implement Google Calendar Provider

**File**: `app/lib/calendar-providers/google.ts`

**Actions**:
- Implement `GoogleCalendarProvider` class:

```typescript
export class GoogleCalendarProvider implements CalendarProvider {
  name = 'google';

  getAuthUrl(userId: string, redirectUri: string): string {
    // Build Google OAuth URL with:
    // - client_id
    // - redirect_uri
    // - scope: 'https://www.googleapis.com/auth/calendar.readonly'
    // - response_type: 'code'
    // - access_type: 'offline' (for refresh token)
    // - prompt: 'consent' (to always get refresh token)
    // - state: encodeURIComponent(userId) (for CSRF protection)
  }

  async handleCallback(code: string, userId: string): Promise<OAuthTokens> {
    // Exchange authorization code for tokens
    // POST to https://oauth2.googleapis.com/token
    // Save tokens to Firestore (user document)
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    // Refresh access token
    // POST to https://oauth2.googleapis.com/token
    // Return new access_token and updated expires_at
  }

  async checkConflicts(accessToken: string, timeRange: TimeRange): Promise<BusyWindow[]> {
    // Call Google Calendar FreeBusy API
    // POST to https://www.googleapis.com/calendar/v3/freeBusy
    // Query all user's calendars (get list first)
    // Return busy windows
  }
}
```

**Pattern Reference**: `tanstack-cloudflare.oauth-token-refresh.md`

### 4. User Settings UI - Connect Google Calendar

**File**: `app/routes/settings.tsx`

**Actions**:
- Add "Google Calendar" section to settings
- Show connection status:
  - If connected: "Connected ✓" + "Disconnect" button + last synced timestamp
  - If disconnected: "Not connected" + "Connect Google Calendar" button
- "Connect Google Calendar" button:
  - Calls `getAuthUrl(userId, redirectUri)`
  - Redirects to Google OAuth consent screen
- "Disconnect" button:
  - Deletes OAuth tokens from Firestore
  - Shows toast: "Google Calendar disconnected"

### 5. OAuth Callback Route

**File**: `app/routes/auth.google.callback.ts`

**Actions**:
- Handle OAuth callback from Google
- Parse `code` and `state` from query params
- Validate `state` matches userId (CSRF protection)
- Call `handleCallback(code, userId)`
- Save tokens to Firestore:

```typescript
// User document schema update
{
  google_calendar: {
    connected: boolean,
    access_token: string,
    refresh_token: string,
    expires_at: number, // Unix timestamp
    connected_at: timestamp,
    last_synced: timestamp | null
  }
}
```

- Redirect to settings with success toast: "Google Calendar connected!"

### 6. Proactive Token Refresh Cron Job

**File**: `wrangler.toml` (or Cloudflare dashboard)

**Actions**:
- Create Cloudflare Scheduled Task (cron): Run every 30 minutes
- File: `app/scheduled/refresh-google-tokens.ts`
- Query Firestore for users with `google_calendar.connected: true`
- For each user, check if `expires_at < now + 1 hour`
- If expiring soon:
  - Call `provider.refreshToken(user.google_calendar.refresh_token)`
  - Update Firestore with new access_token and expires_at
- Handle refresh errors (token revoked):
  - Set `google_calendar.connected: false`
  - Log error for user notification

**Pattern Reference**: `tanstack-cloudflare.scheduled-tasks.md`, `tanstack-cloudflare.oauth-token-refresh.md`

### 7. Graceful Degradation UI

**Actions**:
- If Google Calendar connection fails (token revoked, refresh failed):
  - Show banner in dashboard: "⚠️ Google Calendar disconnected — bookings may conflict with your calendar. Reconnect in Settings."
  - Allow bookings to continue (don't block)
  - Skip conflict checking (return empty busy windows)

### 8. Testing

**Actions**:
- Test OAuth flow end-to-end
- Verify `calendar.readonly` scope requested (not `calendar.events`)
- Test token refresh (manually expire token or wait 1 hour)
- Test token revocation (revoke via Google account settings)
- Verify graceful degradation (banner shows, bookings continue)
- Test disconnect/reconnect flow
- Verify tokens stored securely in Firestore

## Verification

- [ ] Google Cloud project created with Calendar API enabled
- [ ] OAuth 2.0 credentials configured with correct redirect URI
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stored as Cloudflare secrets
- [ ] `CalendarProvider` interface defined
- [ ] `GoogleCalendarProvider` implements interface correctly
- [ ] "Connect Google Calendar" button in settings
- [ ] OAuth flow redirects to Google consent screen with `calendar.readonly` scope
- [ ] Callback route exchanges code for tokens and saves to Firestore
- [ ] Connection status displays in settings (connected/disconnected)
- [ ] "Disconnect" button removes tokens and updates status
- [ ] Cloudflare cron job refreshes tokens before expiry
- [ ] Token revocation triggers graceful degradation (banner + skip conflict checking)
- [ ] Provider-adapter pattern allows easy addition of Outlook/M365 later

## Notes

- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2/web-server
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
- FreeBusy API: https://developers.google.com/calendar/api/v3/reference/freebusy/query
- Access tokens expire after 1 hour by default
- Refresh tokens are long-lived (but can be revoked by user)
- Provider-adapter pattern makes adding Outlook trivial in P2

---

**Status**: Not Started
**Created**: 2026-03-17
