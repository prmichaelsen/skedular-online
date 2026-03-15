# Task 2: Wire Booking Confirmation + Cancellation Emails

**Milestone**: M1 — Email Infrastructure
**Estimated Time**: 2 hours
**Dependencies**: Task 1
**Status**: Not Started

---

## Objective

Wire email sending into the booking and cancellation flows so both parties receive confirmation/cancellation emails with .ics attachments and cancel links.

## Steps

1. Update `/$username` booking page — after `createBooking()` succeeds, call server function to send:
   - Confirmation to booker (name, date, time, timezone, .ics, cancel link)
   - Confirmation to calendar owner (booker name, email, date, time, notes)
2. Update `/cancel/$token` page — after `cancelBooking()` succeeds, call server function to send:
   - Cancellation notice to booker
   - Cancellation notice to calendar owner
3. Create email HTML templates (inline styles for email clients):
   - Booking confirmation template
   - Cancellation notification template
4. Upload `MANDRILL_API_KEY` as Cloudflare secret via `npm run cf-secrets:upload`
5. Deploy and test end-to-end

## Verification

- [ ] Booking creates and sends confirmation email to booker
- [ ] Booking creates and sends confirmation email to owner
- [ ] Confirmation email contains .ics attachment
- [ ] Confirmation email contains cancel link pointing to /cancel/{token}
- [ ] Cancellation sends notification to both parties
- [ ] Emails render correctly in Gmail
- [ ] Deployed and working in production
