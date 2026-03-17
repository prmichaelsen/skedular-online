/**
 * Calendar Provider Interface
 *
 * Defines the contract for calendar provider implementations (Google, Outlook, etc.)
 * Enables consistent multi-provider support with provider-adapter pattern
 */

export interface CalendarProvider {
  /** Provider identifier (e.g., 'google', 'outlook') */
  name: string

  /**
   * Generate OAuth authorization URL for user consent
   * @param userId - Skedular user ID (for CSRF state validation)
   * @param redirectUri - OAuth callback URL
   * @returns Authorization URL to redirect user to
   */
  getAuthUrl(userId: string, redirectUri: string): string

  /**
   * Exchange authorization code for OAuth tokens
   * @param code - Authorization code from OAuth callback
   * @param userId - Skedular user ID (for validation)
   * @param redirectUri - Same redirect URI used in getAuthUrl
   * @returns OAuth tokens with expiry
   */
  handleCallback(code: string, userId: string, redirectUri: string): Promise<OAuthTokens>

  /**
   * Refresh expired access token using refresh token
   * @param refreshToken - Long-lived refresh token
   * @returns New OAuth tokens with updated expiry
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>

  /**
   * Check for calendar conflicts in given time range
   * @param accessToken - Valid OAuth access token
   * @param timeRange - Time range to check for conflicts
   * @returns List of busy windows (existing events)
   */
  checkConflicts(accessToken: string, timeRange: TimeRange): Promise<BusyWindow[]>
}

export interface OAuthTokens {
  /** Short-lived access token (typically 1 hour) */
  access_token: string

  /** Long-lived refresh token (can be revoked by user) */
  refresh_token: string

  /** Unix timestamp when access_token expires */
  expires_at: number

  /** OAuth scope granted (e.g., 'calendar.readonly') */
  scope: string
}

export interface TimeRange {
  /** Start of time range (inclusive) */
  start: Date

  /** End of time range (exclusive) */
  end: Date
}

export interface BusyWindow {
  /** Start of busy period (existing calendar event) */
  start: Date

  /** End of busy period */
  end: Date
}

/**
 * Calendar connection stored in user profile
 */
export interface CalendarConnection {
  /** Whether calendar is currently connected */
  connected: boolean

  /** OAuth access token (short-lived) */
  access_token: string

  /** OAuth refresh token (long-lived) */
  refresh_token: string

  /** Unix timestamp when access_token expires */
  expires_at: number

  /** ISO timestamp when connection was established */
  connected_at: string

  /** ISO timestamp of last successful sync/conflict check */
  last_synced: string | null
}
