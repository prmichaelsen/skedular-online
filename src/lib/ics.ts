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

/**
 * Convert a local date/time in a given IANA timezone to a UTC Date object.
 * Works in Cloudflare Workers (V8 runtime with UTC system timezone).
 */
function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const refDate = new Date(`${dateStr}T${timeStr}:00Z`)
  const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = refDate.toLocaleString('en-US', { timeZone: timezone })
  const offset = new Date(utcStr).getTime() - new Date(tzStr).getTime()
  return new Date(refDate.getTime() + offset)
}

function formatUTCDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
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
  const stamp = formatUTCDate(now)

  const startUTC = localToUTC(event.startDate, event.startTime, event.timezone)
  const endUTC = localToUTC(event.startDate, event.endTime, event.timezone)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skedular//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatUTCDate(startUTC)}`,
    `DTEND:${formatUTCDate(endUTC)}`,
    `SUMMARY:${escapeICS(event.title)}`,
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
