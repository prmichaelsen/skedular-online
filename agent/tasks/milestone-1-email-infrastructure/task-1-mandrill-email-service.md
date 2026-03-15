# Task 1: Mandrill Email Service + API Route

**Milestone**: M1 — Email Infrastructure
**Estimated Time**: 2 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Create a Mandrill email client and server function for sending transactional emails from the Cloudflare Worker, plus an .ics calendar file generator for attachments.

## Steps

1. Create `src/lib/email.ts` — Mandrill REST API client using fetch (no SDK)
   - `sendEmail({ to, subject, html, attachments })` function
   - Reads `MANDRILL_API_KEY` from environment
   - Uses Mandrill `/api/1.0/messages/send` endpoint
2. Create `src/lib/ics.ts` — .ics calendar file generator
   - `generateICS({ title, description, start, end, location, organizer, attendee })` function
   - Returns string content for .ics file
3. Create server function `sendBookingEmail` in `src/lib/server-fn.ts`
   - Accepts booking details, generates HTML, attaches .ics, sends via Mandrill
4. Add `MANDRILL_API_KEY` to `worker-configuration.d.ts` Env interface
5. Add `MANDRILL_API_KEY` to `.env.example`

## Verification

- [ ] `src/lib/email.ts` exists with Mandrill REST client
- [ ] `src/lib/ics.ts` exists with .ics generator
- [ ] Server function created for sending emails
- [ ] TypeScript compiles without errors
- [ ] Env type updated with MANDRILL_API_KEY
