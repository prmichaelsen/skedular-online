# Milestone 1: Email Infrastructure

**Goal**: Enable transactional email sending via Mandrill for booking confirmations and cancellations
**Duration**: 1 session (~4 hours)
**Dependencies**: None (MVP already deployed)
**Status**: Not Started

---

## Overview

Add email infrastructure using Mandrill (Mailchimp Transactional) to send booking confirmation and cancellation emails with .ics calendar attachments. Emails are sent from a Cloudflare Worker server function triggered after booking creation or cancellation.

## Deliverables

- Mandrill API client for Cloudflare Workers
- .ics calendar file generator
- Booking confirmation emails (to both booker and calendar owner)
- Cancellation notification emails
- Cancel/reschedule links in emails

## Success Criteria

- [ ] Booking confirmation email sent to booker with .ics attachment
- [ ] Booking confirmation email sent to calendar owner
- [ ] Cancellation email sent to both parties
- [ ] Emails contain correct booking details (date, time, timezone)
- [ ] Cancel link in email works (links to /cancel/{token})
- [ ] Mandrill API key stored as Cloudflare secret
- [ ] Deployed and working in production

---

**Blockers**: Need Mandrill API key configured
