/**
 * HTML email templates for booking confirmations and cancellations.
 * Inline styles for email client compatibility.
 */

interface BookingDetails {
  ownerName: string
  bookerName: string
  bookerEmail: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  duration: number
  notes?: string
  cancelUrl: string
  bookingPageUrl: string
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`
}

const WRAPPER_START = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
`

const WRAPPER_END = `
</table>
</td></tr></table>
</body>
</html>
`

export function confirmationToBooker(details: BookingDetails): string {
  return `${WRAPPER_START}
<tr><td style="background:#3B82F6;padding:24px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Booking Confirmed</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 16px;color:#111827;font-size:16px;">
    Hi ${details.bookerName},
  </p>
  <p style="margin:0 0 24px;color:#4B5563;font-size:14px;">
    Your meeting with <strong>${details.ownerName}</strong> has been confirmed.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 24px;">
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Date</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${formatDate(details.date)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Time</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${formatTime(details.startTime)} – ${formatTime(details.endTime)} (${details.duration} min)</p>
    </td></tr>
    ${details.notes ? `<tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Notes</p>
      <p style="margin:0;color:#4B5563;font-size:14px;">${details.notes}</p>
    </td></tr>` : ''}
  </table>
  <p style="margin:0 0 24px;color:#4B5563;font-size:13px;">
    A calendar invite (.ics) is attached to this email.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="background:#EF4444;border-radius:8px;padding:10px 20px;">
      <a href="${details.cancelUrl}" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;">Cancel booking</a>
    </td></tr>
  </table>
  <p style="margin:0;color:#9CA3AF;font-size:12px;">
    Powered by <a href="${details.bookingPageUrl}" style="color:#3B82F6;text-decoration:none;">Skedular</a>
  </p>
</td></tr>
${WRAPPER_END}`
}

export function confirmationToOwner(details: BookingDetails): string {
  return `${WRAPPER_START}
<tr><td style="background:#3B82F6;padding:24px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">New Booking</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 16px;color:#111827;font-size:16px;">
    Hi ${details.ownerName},
  </p>
  <p style="margin:0 0 24px;color:#4B5563;font-size:14px;">
    <strong>${details.bookerName}</strong> (${details.bookerEmail}) booked a meeting with you.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 24px;">
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Date</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${formatDate(details.date)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Time</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${formatTime(details.startTime)} – ${formatTime(details.endTime)} (${details.duration} min)</p>
    </td></tr>
    ${details.notes ? `<tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Notes</p>
      <p style="margin:0;color:#4B5563;font-size:14px;">${details.notes}</p>
    </td></tr>` : ''}
  </table>
  <p style="margin:0;color:#9CA3AF;font-size:12px;">
    A calendar invite (.ics) is attached to this email.
  </p>
</td></tr>
${WRAPPER_END}`
}

export function cancellationNotification(details: BookingDetails & { recipientName: string }): string {
  return `${WRAPPER_START}
<tr><td style="background:#EF4444;padding:24px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Booking Cancelled</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 16px;color:#111827;font-size:16px;">
    Hi ${details.recipientName},
  </p>
  <p style="margin:0 0 24px;color:#4B5563;font-size:14px;">
    The following booking has been cancelled.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin:0 0 24px;">
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Date</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;text-decoration:line-through;">${formatDate(details.date)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Time</p>
      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;text-decoration:line-through;">${formatTime(details.startTime)} – ${formatTime(details.endTime)}</p>
    </td></tr>
    <tr><td style="padding:8px 16px;">
      <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;text-transform:uppercase;">Between</p>
      <p style="margin:0;color:#4B5563;font-size:14px;">${details.ownerName} &amp; ${details.bookerName}</p>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0">
    <tr><td style="background:#3B82F6;border-radius:8px;padding:10px 20px;">
      <a href="${details.bookingPageUrl}" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;">Book a new time</a>
    </td></tr>
  </table>
</td></tr>
${WRAPPER_END}`
}
