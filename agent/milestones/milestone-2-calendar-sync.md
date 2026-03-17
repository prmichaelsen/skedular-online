# Milestone 2: Calendar Sync

**Goal**: Enable calendar subscription feeds and Google Calendar conflict checking with security-first OAuth integration
**Duration**: 2-3 weeks
**Dependencies**: M1 (Email Infrastructure)
**Status**: Not Started

---

## Overview

Implement calendar synchronization features that allow users to subscribe to their skedular bookings in external calendars (Google, Outlook, Apple) and check for conflicts with their existing Google Calendar events. This milestone prioritizes security by using read-only OAuth permissions and .ics feeds for write-back instead of broader calendar modification permissions.

## Deliverables

### 1. .ics Subscription Feed
- Token-protected feed endpoint at `skedular.online/cal/{username}.ics?token={secret}`
- User settings toggle to enable/disable feed (disabled by default)
- "Regenerate URL" button for token rotation
- Feed contains confirmed bookings only (not availability windows)
- Full booking details visible to owner (booker name, email, notes, cancel link)
- Rate limiting (60 req/min per token via Cloudflare)

### 2. Google Calendar OAuth Integration
- "Connect Google Calendar" button in settings with connection status
- OAuth flow with `calendar.readonly` scope only (no write permissions)
- Proactive token refresh via Cloudflare cron job
- Graceful degradation when token revoked (show banner, skip conflict checking)
- Provider-adapter pattern for multi-provider support

### 3. Conflict Checking
- Real-time FreeBusy API queries with 5-minute cache
- Hide conflicting slots from booking page (server-side filtering)
- Check all user calendars by default (picker UI deferred to post-MVP)
- Fast performance (~100-200ms query time)

## Success Criteria

- [ ] Owner can enable .ics feed in settings and subscribe in Google/Outlook/Apple Calendar
- [ ] Bookings appear in subscribed calendar within polling period (12-24hr for Google)
- [ ] Token regeneration invalidates old URL and generates new one
- [ ] User can connect Google Calendar via OAuth (read-only scope)
- [ ] Booking page hides time slots that conflict with Google Calendar events
- [ ] Conflict checking works across all user's Google calendars
- [ ] Token refresh happens automatically before expiry
- [ ] When Google Calendar disconnected, booking page shows banner but allows bookings
- [ ] Provider-adapter architecture implemented for easy Outlook/M365 addition

## Out of Scope (Deferred)

- Direct calendar writes via Google Calendar API (using .ics feed + email attachment instead)
- Calendar picker UI (check all calendars in MVP)
- Outlook/M365 provider (P2 - after Google)
- Apple CalDAV integration (rely on .ics feed)

## Key Design Decisions

### Security-First Approach
- **OAuth Scope**: `calendar.readonly` only (no write permissions)
- **Write-Back**: .ics subscription feed + email attachment (no direct API writes)
- **Rationale**: Avoids risk of skedular modifying/deleting user's existing calendar events

### Provider Architecture
- **Pattern**: Provider-adapter from day one
- **Interface**: `checkConflicts()`, `getAuthUrl()`, `handleCallback()`, `refreshToken()`
- **Rationale**: Makes adding Outlook/M365 trivial in P2

### .ics Feed Design
- **Consumer**: Owner-only (booker gets .ics attachment via email)
- **Content**: Confirmed bookings only (not availability windows)
- **Privacy**: Secret token in URL, rotatable from settings

## Technical Notes

- FreeBusy API is lightweight and designed for conflict checking use case
- .ics feed polling frequency controlled by subscribing calendar app (not skedular)
- Provider-adapter pattern defined in `tanstack-cloudflare.provider-adapter.md`
- OAuth token refresh pattern defined in `tanstack-cloudflare.oauth-token-refresh.md`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FreeBusy API rate limits | 5-minute cache + Cloudflare rate limiting safety net |
| OAuth token expiration | Proactive cron job refresh before expiry |
| User revokes access | Graceful degradation - allow bookings, show reconnect banner |
| .ics feed URL leaks | Token rotation feature in settings |

---

**Status**: Not Started
**Created**: 2026-03-17
**Estimated Completion**: TBD (start after M1)
