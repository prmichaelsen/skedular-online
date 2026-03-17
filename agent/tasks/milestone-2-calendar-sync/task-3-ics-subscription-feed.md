# Task 3: .ics Subscription Feed Endpoint + User Settings

**Milestone**: M2 — Calendar Sync
**Estimated Time**: 4-6 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Implement a token-protected .ics calendar subscription feed that allows calendar owners to subscribe to their skedular bookings in external calendars (Google, Outlook, Apple). Include user settings to enable/disable the feed and regenerate the secret token.

## Context

From the security-first calendar sync design (requirements.md):
- Owner-only subscription feed (booker gets .ics attachment via email - already in M1)
- Feed URL format: `skedular.online/cal/{username}.ics?token={secret}`
- Contains confirmed bookings only (not availability windows)
- Full booking details visible: booker name in title, email/notes in description, cancel link
- Disabled by default with settings toggle
- Token rotatable via "Regenerate URL" button
- Rate limiting: 60 requests/minute per token via Cloudflare

## Steps

### 1. Create .ics Feed API Route

**File**: `app/routes/cal.$username.ics.ts`

**Actions**:
- Create server function route handler
- Parse `username` from path params
- Parse `token` from query params
- Validate token against user's stored feed token in Firestore
- If invalid: return 403 Forbidden
- Query Firestore for user's bookings (`status: 'confirmed'`)
- Generate .ics format (VCALENDAR with VEVENT entries)
- Set proper headers: `Content-Type: text/calendar`, `Cache-Control: private, max-age=300`
- Return .ics file

**iCalendar Format**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Skedular//EN
BEGIN:VEVENT
UID:{booking_id}@skedular.online
DTSTAMP:{created_timestamp}
DTSTART:{booking_start_time}
DTEND:{booking_end_time}
SUMMARY:Meeting with {booker_name}
DESCRIPTION:Booked by {booker_email}\n{notes}\n\nCancel: {cancel_url}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

**Firestore Schema Update** (User document):
```typescript
{
  ics_feed_enabled: boolean,
  ics_feed_token: string | null,
  ics_feed_token_created_at: timestamp | null
}
```

### 2. Add Cloudflare Rate Limiting

**Actions**:
- Use Cloudflare Workers KV or Durable Objects for rate limiting
- Track requests per token (60 req/min limit)
- Return `429 Too Many Requests` when exceeded
- Include `Retry-After` header

**Pattern Reference**: `tanstack-cloudflare.rate-limiting.md`

### 3. User Settings UI - Enable/Disable Feed

**File**: `app/routes/settings.tsx` (or new settings page)

**Actions**:
- Add "Calendar Subscription" section to settings
- Toggle switch: "Enable .ics calendar feed"
- When enabled:
  - Generate random secure token (32 chars, crypto.randomBytes)
  - Save to Firestore: `ics_feed_enabled: true`, `ics_feed_token: <token>`
  - Display subscription URL: `skedular.online/cal/{username}.ics?token={token}`
  - "Copy URL" button
  - Instructions: "Subscribe to this URL in Google Calendar / Outlook / Apple Calendar"
- When disabled:
  - Set `ics_feed_enabled: false` in Firestore
  - Keep token (don't delete) for potential re-enable

### 4. Token Regeneration Feature

**Actions**:
- Add "Regenerate URL" button in settings (only visible when feed enabled)
- On click:
  - Generate new token
  - Update Firestore: `ics_feed_token: <new_token>`, `ics_feed_token_created_at: <now>`
  - Invalidate old token (automatic - just overwrite)
  - Display new subscription URL
  - Show toast: "New URL generated. Old URL is now invalid. Re-subscribe in your calendar app."

### 5. Server-Side Feed Generation

**Actions**:
- Implement iCalendar spec correctly:
  - Use UTC timestamps (DTSTAMP, DTSTART, DTEND)
  - Include UID (unique identifier per booking)
  - Include SEQUENCE (increment on updates - not needed if cancelled bookings removed)
  - Properly escape special characters in SUMMARY/DESCRIPTION
- Handle empty bookings (no VEVENTs, just VCALENDAR wrapper)
- Ensure cancelled bookings are excluded (query `status: 'confirmed'` only)

**Pattern Reference**: `tanstack-cloudflare.third-party-api-integration.md` (for external API structure)

### 6. Testing

**Actions**:
- Test feed in Google Calendar (Add by URL)
- Test feed in Outlook (Add Internet Calendar)
- Test feed in Apple Calendar (Subscribe to Calendar)
- Verify bookings appear correctly
- Verify token rotation invalidates old URL
- Verify rate limiting works (simulate 60+ requests)
- Test with no bookings (empty feed)
- Test with cancelled booking (should not appear)

## Verification

- [ ] .ics feed route created and accessible at `/cal/{username}.ics?token={token}`
- [ ] Invalid token returns 403 Forbidden
- [ ] Feed contains only confirmed bookings (no cancelled/pending)
- [ ] Booking details correctly formatted in iCalendar format
- [ ] Rate limiting enforces 60 req/min per token
- [ ] Settings UI has "Enable Calendar Feed" toggle
- [ ] When enabled, subscription URL displayed with "Copy URL" button
- [ ] "Regenerate URL" button creates new token and invalidates old one
- [ ] Feed successfully subscribed in Google Calendar
- [ ] Feed successfully subscribed in Outlook
- [ ] Feed successfully subscribed in Apple Calendar
- [ ] Bookings appear with correct details (name, time, description)

## Notes

- iCalendar spec: RFC 5545
- Feed polling frequency controlled by subscribing calendar app (not skedular)
- Google polls ~12-24 hours, Apple ~15 minutes
- Token should be cryptographically secure (use crypto.randomBytes, not Math.random)
- Consider adding `Last-Modified` header for conditional requests (optimization)

---

**Status**: Not Started
**Created**: 2026-03-17
