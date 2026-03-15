/**
 * .ics (iCalendar) file generator for booking events.
 */

interface ICSEvent {
  title: string
  description?: string
  startDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  timezone: string // IANA timezone e.g. "America/Phoenix"
  organizerName: string
  organizerEmail: string
  attendeeName: string
  attendeeEmail: string
  uid?: string // unique event ID
  location?: string
}

function formatICSDate(date: string, time: string): string {
  // Format: YYYYMMDDTHHMMSS
  const [y, m, d] = date.split('-')
  const [h, min] = time.split(':')
  return `${y}${m}${d}T${h}${min}00`
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n'
    return `\\${match}`
  })
}

export function generateICS(event: ICSEvent): string {
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@skedular.online`
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skedular//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${event.timezone}:${formatICSDate(event.startDate, event.startTime)}`,
    `DTEND;TZID=${event.timezone}:${formatICSDate(event.startDate, event.endTime)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `ORGANIZER;CN=${escapeICS(event.organizerName)}:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${escapeICS(event.attendeeName)};RSVP=TRUE:mailto:${event.attendeeEmail}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`)
  }

  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

/** Base64 encode a string (works in Cloudflare Workers) */
export function toBase64(str: string): string {
  return btoa(str)
}
