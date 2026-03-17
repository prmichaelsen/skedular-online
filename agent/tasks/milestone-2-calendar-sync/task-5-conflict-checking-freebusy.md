# Task 5: Conflict Checking via Google Calendar FreeBusy API

**Milestone**: M2 — Calendar Sync
**Estimated Time**: 4-6 hours
**Dependencies**: Task 4 (Google Calendar OAuth)
**Status**: Not Started

---

## Objective

Integrate Google Calendar FreeBusy API to check for conflicts when the booking page loads, hide conflicting time slots from the UI, and cache results for 5 minutes to avoid rate limits.

## Context

From the calendar sync design (requirements.md):
- Primary use case: Prevent double-bookings with user's existing Google Calendar events
- Hide conflicting slots from booking page (server-side filtering before render)
- Real-time FreeBusy queries with 5-minute cache
- Check all user's calendars by default (no picker UI in MVP)
- Query is fast (~100-200ms)
- Graceful degradation when Google Calendar disconnected

## Steps

### 1. Implement FreeBusy Query in Provider

**File**: `app/lib/calendar-providers/google.ts` (add to existing GoogleCalendarProvider)

**Actions**:
- Implement `checkConflicts(accessToken, timeRange)`:

```typescript
async checkConflicts(accessToken: string, timeRange: TimeRange): Promise<BusyWindow[]> {
  // Step 1: Get list of user's calendars
  const calendarsResponse = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  const calendars = await calendarsResponse.json();
  const calendarIds = calendars.items.map(cal => cal.id);

  // Step 2: Query FreeBusy for all calendars
  const freeBusyResponse = await fetch(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin: timeRange.start.toISOString(),
        timeMax: timeRange.end.toISOString(),
        items: calendarIds.map(id => ({ id }))
      })
    }
  );

  const freeBusyData = await freeBusyResponse.json();

  // Step 3: Extract busy windows
  const busyWindows: BusyWindow[] = [];
  for (const calendarId in freeBusyData.calendars) {
    const calendar = freeBusyData.calendars[calendarId];
    for (const busy of calendar.busy || []) {
      busyWindows.push({
        start: new Date(busy.start),
        end: new Date(busy.end)
      });
    }
  }

  return busyWindows;
}
```

**Error Handling**:
- If access token expired: attempt refresh via `refreshToken()`
- If refresh fails: throw error (handled by graceful degradation)
- If API call fails: log error and return empty array (fail open)

### 2. Server-Side Conflict Checking Route

**File**: `app/routes/api.check-conflicts.ts`

**Actions**:
- Create server function for conflict checking
- Input: `userId`, `date` (date for which to check conflicts)
- Query Firestore for user's Google Calendar tokens
- If not connected: return `{ connected: false, busyWindows: [] }`
- Calculate timeRange for the date (00:00 - 23:59 in user's timezone)
- Call `provider.checkConflicts(accessToken, timeRange)`
- Return `{ connected: true, busyWindows: [...] }`

### 3. Cache FreeBusy Results

**Actions**:
- Use Cloudflare Workers KV or in-memory cache (Durable Objects)
- Cache key: `freebusy:{userId}:{date}`
- TTL: 5 minutes
- On cache miss: query Google Calendar FreeBusy API
- On cache hit: return cached busy windows

**Pattern Reference**: `tanstack-cloudflare.scheduled-tasks.md` (for Durable Objects caching)

### 4. Update Booking Page - Filter Conflicting Slots

**File**: `app/routes/$username.tsx` (booking page)

**Actions**:
- On page load (server-side loader or client useEffect):
  - Fetch user's availability windows (existing logic)
  - Call `/api/check-conflicts` with calendar owner's userId and selected date
  - Merge busy windows with availability windows
  - Filter out slots that overlap with busy windows
  - Return filtered availability slots to client
- Display filtered slots in CalendarPainter/timeslot widget

**Conflict Detection Logic**:
```typescript
function hasConflict(slot: TimeSlot, busyWindows: BusyWindow[]): boolean {
  return busyWindows.some(busy => {
    // Check if slot overlaps with busy window
    return slot.start < busy.end && slot.end > busy.start;
  });
}
```

### 5. Graceful Degradation - Google Calendar Disconnected

**Actions**:
- If `/api/check-conflicts` returns `{ connected: false }`:
  - Show banner in booking page (if owner is viewing their own page):
    - "⚠️ Google Calendar disconnected — availability may not reflect your calendar. Reconnect in Settings."
  - Booker sees normal availability (no conflicts filtered)
  - Allow bookings to proceed
- If API call fails or times out:
  - Log error
  - Return empty busy windows (fail open)
  - Show no banner to booker (seamless degradation)

### 6. Performance Optimization

**Actions**:
- Query FreeBusy only when booking page loads or date changes
- Cache results for 5 minutes to avoid repeated API calls
- Limit timeRange to single day (or week if weekly view)
- Consider preloading next/prev days on navigation

### 7. Testing

**Actions**:
- Create test Google Calendar event at specific time
- Load booking page for that user
- Verify conflicting slot is hidden
- Verify non-conflicting slots are visible
- Test cache (rapid page reloads should not trigger API calls)
- Test with no Google Calendar connection (graceful degradation)
- Test with expired token (refresh should trigger automatically)
- Test with multiple calendars (work + personal)
- Measure FreeBusy API response time (should be ~100-200ms)

## Verification

- [ ] `checkConflicts()` implemented in GoogleCalendarProvider
- [ ] FreeBusy API queries all user's calendars
- [ ] `/api/check-conflicts` server route created
- [ ] Busy windows cached for 5 minutes per user per date
- [ ] Booking page filters out conflicting time slots
- [ ] Conflict detection logic correctly identifies overlapping windows
- [ ] Graceful degradation when Google Calendar disconnected (show banner, allow bookings)
- [ ] Error handling for expired/revoked tokens (triggers refresh or fails open)
- [ ] Performance is fast (~100-200ms for FreeBusy query)
- [ ] Cache prevents repeated API calls on page reloads

## Notes

- Google Calendar FreeBusy API: https://developers.google.com/calendar/api/v3/reference/freebusy/query
- FreeBusy returns busy windows, not event details (privacy-preserving)
- Cache TTL of 5 minutes balances freshness vs API rate limits
- Conflict checking happens server-side (before page render) for better UX
- Future enhancement: Real-time conflict checking via WebSocket (not in MVP)

---

**Status**: Not Started
**Created**: 2026-03-17
**Dependencies**: Task 4 (Google Calendar OAuth must be complete)
