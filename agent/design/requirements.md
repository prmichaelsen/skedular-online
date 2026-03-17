# Project Requirements

**Project Name**: Skedular
**Created**: 2026-03-15
**Status**: Active

---

## Overview

An online availability painter web app and scheduling tool (Calendly clone). Users paint their availability on a weekly calendar, share a booking link, and let others schedule time with them.

---

## Problem Statement

Scheduling meetings requires back-and-forth coordination. Users need a simple tool to declare availability and let others self-serve book time slots, with automatic confirmations and calendar integration.

---

## Goals and Objectives

### Primary Goals
1. Let users paint availability on a visual weekly calendar with configurable hour ranges and 15/30-minute granularity
2. Generate shareable booking links with custom URLs (skedular.com/{username})
3. Let guests book time slots without creating an account
4. Send email confirmations with .ics attachments and Gmail invites

### Secondary Goals
1. Support team/organization accounts
2. Integrate with external calendars (Google Calendar, Outlook) for conflict checking (P2)
3. Customizable booking page branding (P3)

---

## Functional Requirements

### Core Features (MVP)
1. **Availability Painting**: CalendarPainter component — configurable hour range, 15/30-min granularity, specific date overrides (not just weekly recurring), "soonest available" auto-select mode
2. **Custom Booking URL**: Each user gets skedular.com/{username}
3. **Booking Page**: Weekly calendar view + timeslot selection widget on same page, displayed in booker's local timezone
4. **Guest Booking**: Name + email required, optional Notes field, no account needed
5. **Email Confirmations**: Both parties receive confirmation with .ics attachment and Gmail invite
6. **Cancel/Reschedule**: Email links for cancel/reschedule; anonymous Firebase user session persists so booker can also cancel from UX
7. **Timezone Support**: Auto-detect via browser, set as cookie so server can read it; user profile requires explicit timezone
8. **User-Configurable Limits**: Buffer time between meetings, max bookings per day, minimum notice period
9. **Event Duration**: Default 30 minutes, configurable per calendar owner

### Deferred Features
1. **Multiple Event Types**: Different durations/names per event type (post-MVP)
2. **Calendar Integration**: Google Calendar / Outlook conflict checking (P2)
3. **Auto-add to Calendar**: Booked events added to user's external calendar (P2)
4. **Booking Page Branding**: Profile photo, bio, colors (P3)

---

## Non-Functional Requirements

### Performance
- Booking page loads in < 2 seconds
- Real-time availability updates (nice to have)

### Security
- Firebase Auth for all user accounts
- Data isolation between users/orgs
- Anonymous Firebase sessions for guest bookers

### Scalability
- Firestore scales automatically
- Cloudflare Workers edge deployment

---

## Technical Requirements

### Technology Stack
- **Language**: TypeScript
- **Framework**: TanStack Start (React)
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (email/password)
- **Infrastructure**: Cloudflare Workers/Pages
- **Email**: TBD (transactional email service)

### Key Dependencies
- TanStack Router / Start
- Firebase Auth + Firestore SDK
- CalendarPainter component (already built)

### Data Model (design for future calendar integration)
- **User**: uid, email, name, phone (opt), location (opt), timezone (req), username (unique), org_id (opt)
- **Availability**: user_id, windows[] (dayOfWeek, startHour, endHour, granularity), date overrides, soonest mode flag
- **EventType**: user_id, name, duration, buffer_time, max_per_day, min_notice
- **Booking**: event_type_id, booker_email, booker_name, notes, date, start_time, end_time, status, cancel_token, anonymous_uid

---

## User Stories

### As a Calendar Owner
1. I want to paint my availability on a visual calendar so that I can quickly set when I'm free
2. I want to share a booking link so that others can schedule time with me
3. I want to configure event duration and buffer time so that I control my schedule
4. I want to receive email confirmations so that I know when someone books

### As a Booker (Guest)
1. I want to see available time slots in my timezone so that I can book easily
2. I want to book without creating an account so that there's no friction
3. I want to receive a confirmation with a calendar invite so that it's on my calendar
4. I want to cancel or reschedule via email link so that I can change plans

---

## Constraints

### Technical Constraints
- Must use TanStack + Cloudflare stack (tanstack-cloudflare patterns installed)
- Firebase Auth and Firestore as backend services
- CalendarPainter component already exists and is the core UI

### Resource Constraints
- Aggressive timeline — MVP target is same-day delivery
- Single developer + AI agent

---

## Success Criteria

### MVP Success Criteria
- [ ] User can sign up, log in, and set their timezone
- [ ] User can paint availability with CalendarPainter
- [ ] User gets a shareable booking link at /{username}
- [ ] Guest can view availability and book a slot
- [ ] Both parties receive email confirmation with .ics
- [ ] Guest can cancel/reschedule via email link
- [ ] Timezone auto-detection works correctly

---

## Out of Scope (MVP)

1. **Multiple event types**: Single default event type for MVP
2. **Calendar sync**: No Google/Outlook integration initially (data model supports it)
3. **Booking page branding**: Default styling only
4. **Payment integration**: No paid bookings
5. **Recurring bookings**: One-off bookings only
6. **Mobile native app**: Web only

---

## Key Design Decisions (from Clarification 1)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Availability granularity | 15/30-min configurable | User preference for flexibility |
| Availability model | Specific dates, not just weekly recurring | More control over schedule |
| Booking page layout | Weekly view + timeslot widget on same page | Single-page UX |
| Guest auth | Anonymous Firebase user | Enables cancel/reschedule from UX without account |
| Database | Firestore | Lightweight, real-time capable |
| Hosting | Cloudflare | Matches tanstack-cloudflare patterns |
| Auth method | Email/password via Firebase | Simple, no OAuth complexity for MVP |
| Timezone | Auto-detect + browser cookie | Server-readable, seamless UX |

---

## Key Design Decisions (from Clarification 2 - Calendar Sync)

### .ics Feed Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Feed URL format | `skedular.online/cal/{username}.ics?token={secret}` | Secret token protects private booking details, rotatable from settings |
| Feed consumers | Owner-only subscription feed | Booker gets single-event .ics via email (already in M1 scope) |
| Feed content | Confirmed bookings only | Availability windows would clutter calendar view with 20+ "Available" blocks per week |
| Booking details visibility | Full details (booker name in title, email/notes in description, cancel link) | Token-protected feed means only owner sees details |
| User control | Disabled by default, settings toggle + "Regenerate URL" button | Opt-in with token rotation if URL leaks |
| Cancelled bookings | Removed from feed entirely | Calendar apps handle removal better than STATUS:CANCELLED |
| Rate limiting | 60 requests/minute per token via Cloudflare | Polling frequency controlled by subscribing calendar app (Google: 12-24hr, Apple: ~15min) |

### Google Calendar Integration

| Decision | Choice | Rationale |
|---|---|---|
| Primary use case | Conflict checking via FreeBusy API | Prevents double-bookings with user's existing calendar events |
| OAuth scope | `calendar.readonly` only (read-only) | Zero risk of modifying user's calendar inappropriately |
| Conflict resolution | Hide conflicting slots from booking page | Better UX than showing slots that get rejected at booking time |
| Query strategy | Real-time FreeBusy queries with 5-minute cache | Always accurate, fast (~100-200ms), avoids stale sync data |
| OAuth setup | "Connect Google Calendar" button in settings | Standard OAuth flow with connect/disconnect status display |
| Token refresh | Proactive refresh via Cloudflare cron job before expiry | Prevents token expiration for active users |
| Token revocation | Graceful degradation (skip conflict checking, show banner) | Allows bookings to continue even if Google connection breaks |
| Multiple calendars | Check all calendars in MVP, add picker later | FreeBusy API supports multiple calendar IDs in one call |

### Write-Back Strategy (Security-First)

| Decision | Choice | Rationale |
|---|---|---|
| Approach | Read-only OAuth + .ics feed (Option C) | Avoids `calendar.events` scope which would allow deleting ANY user event |
| Write mechanism | .ics subscription feed for auto-sync + email attachment for manual add | No direct calendar API writes required |
| Security trade-off | Events don't appear instantly (12-24hr polling delay) | Acceptable given zero risk of inappropriate calendar modifications |
| Future path | Opt-in write permission toggle if users demand instant sync | Can add later with clear warnings about broader permissions |

### Multi-Provider Support

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Provider-adapter pattern from day one | Makes adding Outlook trivial later even if Google ships first |
| Google Calendar | P1 - Ships in M2 | 80% market share for personal/small-business scheduling |
| Outlook/M365 | P2 - Same features/UX via Microsoft Graph API | Enterprise-focused, add after validating pattern with Google |
| Apple Calendar | .ics subscription feed sufficient | No OAuth-based API, but native .ics support covers use case |
| Provider interface | `checkConflicts()`, `getAuthUrl()`, `handleCallback()`, `refreshToken()` | Common interface abstracts provider differences |

### Feature Sequencing

| Decision | Choice | Rationale |
|---|---|---|
| Milestone | New M2 - Calendar Sync | Distinct from M1 Email Infrastructure, clear dependencies |
| Ship order | .ics feed first, then Google Calendar OAuth | Simpler feature delivers value immediately, OAuth builds on it |
| Task 4 removal | No direct Google Calendar API write-back | Using read-only OAuth + .ics feed instead (security decision) |

---

**Status**: Active
**Last Updated**: 2026-03-17
