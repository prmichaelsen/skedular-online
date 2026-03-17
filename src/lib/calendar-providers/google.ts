import type { CalendarProvider, OAuthTokens, TimeRange, BusyWindow } from './types'

/**
 * Google Calendar Provider Implementation
 *
 * OAuth scope: calendar.readonly (read-only, no write permissions)
 * API: Google Calendar API v3
 * Docs: https://developers.google.com/calendar/api/v3/reference
 */
export class GoogleCalendarProvider implements CalendarProvider {
  name = 'google' as const

  private clientId: string
  private clientSecret: string

  constructor(clientId?: string, clientSecret?: string) {
    // In Cloudflare Workers, env vars must be passed explicitly
    this.clientId = clientId || ''
    this.clientSecret = clientSecret || ''

    if (!this.clientId) {
      console.warn('Google Calendar: Missing GOOGLE_CLIENT_ID')
    }
    if (!this.clientSecret) {
      console.warn('Google Calendar: Missing GOOGLE_CLIENT_SECRET')
    }
  }

  /**
   * Generate Google OAuth authorization URL
   * Scope: calendar.readonly (read-only access to calendar events)
   */
  getAuthUrl(userId: string, redirectUri: string): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured')
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Always show consent to guarantee refresh token
      state: encodeURIComponent(userId), // CSRF protection
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for OAuth tokens
   */
  async handleCallback(code: string, _userId: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google OAuth token exchange failed: ${error}`)
    }

    const data = await response.json()

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000, // Convert seconds to ms
      scope: data.scope,
    }
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google OAuth token refresh failed: ${error}`)
    }

    const data = await response.json()

    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Refresh token doesn't change
      expires_at: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    }
  }

  /**
   * Check for calendar conflicts using FreeBusy API
   * Queries all user's calendars and returns busy windows
   */
  async checkConflicts(accessToken: string, timeRange: TimeRange): Promise<BusyWindow[]> {
    // First, get list of user's calendars
    const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!calendarsResponse.ok) {
      const error = await calendarsResponse.text()
      throw new Error(`Google Calendar list failed: ${error}`)
    }

    const calendarsData = await calendarsResponse.json()
    const calendarIds = calendarsData.items.map((cal: any) => ({ id: cal.id }))

    // Query FreeBusy API for all calendars
    const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeRange.start.toISOString(),
        timeMax: timeRange.end.toISOString(),
        items: calendarIds,
      }),
    })

    if (!freeBusyResponse.ok) {
      const error = await freeBusyResponse.text()
      throw new Error(`Google FreeBusy API failed: ${error}`)
    }

    const freeBusyData = await freeBusyResponse.json()

    // Extract busy windows from all calendars
    const busyWindows: BusyWindow[] = []
    for (const [_calendarId, calendarData] of Object.entries(freeBusyData.calendars)) {
      const busy = (calendarData as any).busy || []
      for (const period of busy) {
        busyWindows.push({
          start: new Date(period.start),
          end: new Date(period.end),
        })
      }
    }

    return busyWindows
  }
}

/**
 * Create provider instance with environment variables
 * Must be called with env vars from Cloudflare Worker context
 */
export function createGoogleCalendarProvider(env: any): GoogleCalendarProvider {
  return new GoogleCalendarProvider(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  )
}
