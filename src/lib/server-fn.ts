import { createServerFn } from '@tanstack/react-start'
import {
  initializeApp,
  getDocument,
  queryDocuments,
  addDocument,
  updateDocument,
} from '@prmichaelsen/firebase-admin-sdk-v8'
import serviceAccount from '../../skedular-prod-service.json'
import { sendEmail } from './email'
import { generateICS, toBase64 } from './ics'
import { confirmationToBooker, confirmationToOwner, cancellationNotification } from './email-templates'
import type { UserProfile, Availability, Booking } from './types'

// ── Admin SDK Initialization ─────────────────────────────

let adminInitialized = false
function ensureAdminInitialized() {
  if (!adminInitialized) {
    initializeApp({
      serviceAccount: serviceAccount as any,
      projectId: serviceAccount.project_id,
    })
    adminInitialized = true
  }
}

// ── SSR Data Preload Functions ─────────────────────────

export async function fetchBookingPageData(username: string): Promise<{
  owner: UserProfile | null
  availability: Availability | null
  bookings: Booking[]
}> {
  ensureAdminInitialized()

  const userDocs = await queryDocuments('users', {
    where: [{ field: 'username', op: '==', value: username.toLowerCase() }],
  })
  if (userDocs.length === 0) {
    return { owner: null, availability: null, bookings: [] }
  }
  const owner = { uid: userDocs[0].id, ...userDocs[0].data } as UserProfile

  const [availability, bookingDocs] = await Promise.all([
    getDocument('availability', owner.uid),
    queryDocuments('bookings', {
      where: [
        { field: 'userId', op: '==', value: owner.uid },
        { field: 'status', op: '==', value: 'confirmed' },
      ],
    }),
  ])

  return {
    owner,
    availability: availability as Availability | null,
    bookings: bookingDocs.map((d) => ({ id: d.id, ...d.data }) as Booking),
  }
}

export async function fetchDashboardData(uid: string): Promise<{
  profile: UserProfile | null
  availability: Availability | null
  bookings: Booking[]
}> {
  ensureAdminInitialized()

  const [profile, availability, bookingDocs] = await Promise.all([
    getDocument('users', uid),
    getDocument('availability', uid),
    queryDocuments('bookings', {
      where: [
        { field: 'userId', op: '==', value: uid },
        { field: 'status', op: '==', value: 'confirmed' },
      ],
    }),
  ])

  return {
    profile: profile as UserProfile | null,
    availability: availability as Availability | null,
    bookings: bookingDocs.map((d) => ({ id: d.id, ...d.data }) as Booking),
  }
}

// ── Server-Side Booking with Conflict Check ───────────

interface CreateBookingInput {
  userId: string
  bookerEmail: string
  bookerName: string
  notes?: string
  date: string
  startTime: string
  endTime: string
  timezone: string
  cancelToken: string
  bufferTime: number
}

export const createBookingWithConflictCheck = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateBookingInput) => input)
  .handler(async ({ data }): Promise<{ success: true; bookingId: string } | { success: false; error: string; code: number }> => {
    ensureAdminInitialized()

    // Check for conflicts
    const existingBookings = await queryDocuments('bookings', {
      where: [
        { field: 'userId', op: '==', value: data.userId },
        { field: 'date', op: '==', value: data.date },
        { field: 'status', op: '==', value: 'confirmed' },
      ],
    })

    const [sh, sm] = data.startTime.split(':').map(Number)
    const [eh, em] = data.endTime.split(':').map(Number)
    const newStart = sh * 60 + sm
    const newEnd = eh * 60 + em
    const buffer = data.bufferTime

    for (const doc of existingBookings) {
      const existing = doc.data as Booking
      const [bsh, bsm] = existing.startTime.split(':').map(Number)
      const [beh, bem] = existing.endTime.split(':').map(Number)
      const existingStart = bsh * 60 + bsm
      const existingEnd = beh * 60 + bem

      if (newStart < existingEnd + buffer && newEnd + buffer > existingStart) {
        return { success: false, error: 'This time slot has already been booked', code: 409 }
      }
    }

    // No conflict — create the booking
    const ref = await addDocument('bookings', {
      userId: data.userId,
      bookerEmail: data.bookerEmail,
      bookerName: data.bookerName,
      notes: data.notes,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      status: 'confirmed',
      cancelToken: data.cancelToken,
      createdAt: new Date().toISOString(),
    })

    return { success: true, bookingId: ref.id }
  })

// ── Email Server Functions ─────────────────────────────

interface SendBookingEmailInput {
  ownerName: string
  ownerEmail: string
  bookerName: string
  bookerEmail: string
  date: string
  startTime: string
  endTime: string
  duration: number
  timezone: string
  notes?: string
  cancelToken: string
  username: string
}

export const sendBookingConfirmation = createServerFn({ method: 'POST' })
  .inputValidator((input: SendBookingEmailInput) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.MANDRILL_API_KEY || ''

    if (!apiKey) {
      console.error('MANDRILL_API_KEY not configured')
      return { success: false, error: 'Email not configured' }
    }

    const baseUrl = 'https://skedular.online'
    const cancelUrl = `${baseUrl}/cancel/${data.cancelToken}`
    const bookingPageUrl = `${baseUrl}/${data.username}`
    const fromEmail = 'support@skedular.online'

    const icsContent = generateICS({
      title: `Meeting: ${data.ownerName} & ${data.bookerName}`,
      description: data.notes || `${data.duration} min meeting booked via Skedular`,
      startDate: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      organizerName: data.ownerName,
      organizerEmail: data.ownerEmail,
      attendeeName: data.bookerName,
      attendeeEmail: data.bookerEmail,
    })
    const icsAttachment = {
      type: 'text/calendar',
      name: 'invite.ics',
      content: toBase64(icsContent),
    }

    const emailDetails = {
      ownerName: data.ownerName,
      bookerName: data.bookerName,
      bookerEmail: data.bookerEmail,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      notes: data.notes,
      cancelUrl,
      bookingPageUrl,
    }

    const bookerResult = await sendEmail(apiKey, {
      to: [{ email: data.bookerEmail, name: data.bookerName }],
      from: { email: fromEmail, name: 'Skedular' },
      subject: `Booking confirmed: ${data.ownerName} on ${data.date}`,
      html: confirmationToBooker(emailDetails),
      attachments: [icsAttachment],
    })

    const ownerResult = await sendEmail(apiKey, {
      to: [{ email: data.ownerEmail, name: data.ownerName }],
      from: { email: fromEmail, name: 'Skedular' },
      subject: `New booking: ${data.bookerName} on ${data.date}`,
      html: confirmationToOwner(emailDetails),
      attachments: [icsAttachment],
    })

    return {
      success: bookerResult.success && ownerResult.success,
      bookerError: bookerResult.error,
      ownerError: ownerResult.error,
    }
  }
)

interface SendCancellationEmailInput {
  ownerName: string
  ownerEmail: string
  bookerName: string
  bookerEmail: string
  date: string
  startTime: string
  endTime: string
  duration: number
  username: string
}

// ── Calendar Feed .ics Generation ─────────────────────

interface GenerateICSFeedInput {
  username: string
  token: string
}

export const generateICSFeed = createServerFn({ method: 'GET' })
  .inputValidator((input: GenerateICSFeedInput) => input)
  .handler(async ({ data }) => {
    ensureAdminInitialized()
    const { username, token } = data

    // Find user by username
    const userDocs = await queryDocuments('users', {
      where: [{ field: 'username', op: '==', value: username.toLowerCase() }],
    })

    if (userDocs.length === 0) {
      return { success: false, error: 'User not found' }
    }

    const userDoc = userDocs[0]
    const userData = userDoc.data

    // Check if .ics feed is enabled
    if (!userData.ics_feed_enabled) {
      return { success: false, error: 'Calendar feed not enabled' }
    }

    // Validate token
    if (userData.ics_feed_token !== token) {
      return { success: false, error: 'Invalid token' }
    }

    // Query confirmed bookings for this user
    const bookingDocs = await queryDocuments('bookings', {
      where: [
        { field: 'userId', op: '==', value: userDoc.id },
        { field: 'status', op: '==', value: 'confirmed' },
      ],
    })

    // Generate .ics file
    const icsLines: string[] = []

    // Calendar header
    icsLines.push('BEGIN:VCALENDAR')
    icsLines.push('VERSION:2.0')
    icsLines.push('PRODID:-//Skedular//EN')
    icsLines.push('CALSCALE:GREGORIAN')
    icsLines.push('METHOD:PUBLISH')
    icsLines.push(`X-WR-CALNAME:Skedular - ${username}`)
    icsLines.push('X-WR-TIMEZONE:UTC')

    // Add events
    for (const doc of bookingDocs) {
      const booking = doc.data as Booking

      // Parse date and time into ISO format
      const [year, month, day] = booking.date.split('-').map(Number)
      const [startHour, startMin] = booking.startTime.split(':').map(Number)
      const [endHour, endMin] = booking.endTime.split(':').map(Number)

      const startDate = new Date(Date.UTC(year, month - 1, day, startHour, startMin))
      const endDate = new Date(Date.UTC(year, month - 1, day, endHour, endMin))
      const createdDate = booking.createdAt ? new Date(booking.createdAt) : new Date()

      // Format dates for iCalendar (YYYYMMDDTHHMMSSZ)
      const formatICalDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      // Escape special characters in text fields
      const escape = (str: string) => {
        if (!str) return ''
        return str
          .replace(/\\/g, '\\\\')
          .replace(/;/g, '\\;')
          .replace(/,/g, '\\,')
          .replace(/\n/g, '\\n')
      }

      // Build description with cancel link
      const baseUrl = 'https://skedular.online'
      const cancelUrl = `${baseUrl}/cancel/${booking.cancelToken}`
      const description = [
        `Booked by ${escape(booking.bookerEmail)}`,
        booking.notes ? `Notes: ${escape(booking.notes)}` : '',
        '',
        `Cancel: ${cancelUrl}`
      ].filter(Boolean).join('\\n')

      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${doc.id}@skedular.online`)
      icsLines.push(`DTSTAMP:${formatICalDate(createdDate)}`)
      icsLines.push(`DTSTART:${formatICalDate(startDate)}`)
      icsLines.push(`DTEND:${formatICalDate(endDate)}`)
      icsLines.push(`SUMMARY:Meeting with ${escape(booking.bookerName)}`)
      icsLines.push(`DESCRIPTION:${description}`)
      icsLines.push('STATUS:CONFIRMED')
      icsLines.push('TRANSP:OPAQUE')
      icsLines.push('END:VEVENT')
    }

    // Calendar footer
    icsLines.push('END:VCALENDAR')

    return { success: true, icsContent: icsLines.join('\r\n') }
  })

export const sendCancellationEmail = createServerFn({ method: 'POST' })
  .inputValidator((input: SendCancellationEmailInput) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.MANDRILL_API_KEY || ''

    if (!apiKey) {
      console.error('MANDRILL_API_KEY not configured')
      return { success: false, error: 'Email not configured' }
    }

    const baseUrl = 'https://skedular.online'
    const bookingPageUrl = `${baseUrl}/${data.username}`
    const fromEmail = 'support@skedular.online'

    const baseDetails = {
      ownerName: data.ownerName,
      bookerName: data.bookerName,
      bookerEmail: data.bookerEmail,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      cancelUrl: '',
      bookingPageUrl,
    }

    const bookerResult = await sendEmail(apiKey, {
      to: [{ email: data.bookerEmail, name: data.bookerName }],
      from: { email: fromEmail, name: 'Skedular' },
      subject: `Booking cancelled: ${data.ownerName} on ${data.date}`,
      html: cancellationNotification({ ...baseDetails, recipientName: data.bookerName }),
    })

    const ownerResult = await sendEmail(apiKey, {
      to: [{ email: data.ownerEmail, name: data.ownerName }],
      from: { email: fromEmail, name: 'Skedular' },
      subject: `Booking cancelled: ${data.bookerName} on ${data.date}`,
      html: cancellationNotification({ ...baseDetails, recipientName: data.ownerName }),
    })

    return {
      success: bookerResult.success && ownerResult.success,
      bookerError: bookerResult.error,
      ownerError: ownerResult.error,
    }
  }
)

// ── Google Calendar Integration ───────────────────────────

interface GetGoogleOAuthUrlInput {
  userId: string
}

export const getGoogleCalendarOAuthUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: GetGoogleOAuthUrlInput) => input)
  .handler(async ({ data, context }): Promise<{ authUrl: string }> => {
    const { createGoogleCalendarProvider } = await import('@/lib/calendar-providers/google')

    const env = (context as any)?.cloudflare?.env || {}
    const clientId = env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = env.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET

    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID not configured')
    }

    const provider = createGoogleCalendarProvider({
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
    })

    const baseUrl = 'https://skedular.online'
    const redirectUri = `${baseUrl}/auth/google/callback`
    const authUrl = provider.getAuthUrl(data.userId, redirectUri)

    return { authUrl }
  })

// ── Google Calendar Helpers ────────────────────────────────

async function ensureValidGoogleToken(
  googleCalendar: any,
  userId: string,
  env: any
): Promise<string | null> {
  if (googleCalendar.expires_at > Date.now()) {
    return googleCalendar.access_token
  }

  console.log(`Refreshing expired Google Calendar token for user ${userId}`)
  try {
    const { createGoogleCalendarProvider } = await import('@/lib/calendar-providers/google')
    const clientId = env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = env.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET
    const provider = createGoogleCalendarProvider({
      GOOGLE_CLIENT_ID: clientId,
      GOOGLE_CLIENT_SECRET: clientSecret,
    })

    const newTokens = await provider.refreshToken(googleCalendar.refresh_token)

    ensureAdminInitialized()
    await updateDocument('users', userId, {
      'google_calendar.access_token': newTokens.access_token,
      'google_calendar.expires_at': newTokens.expires_at,
    })

    console.log(`Successfully refreshed token for user ${userId}`)
    return newTokens.access_token
  } catch (error) {
    console.error(`Failed to refresh token for user ${userId}:`, error)
    return null
  }
}

// ── Google Calendar Conflict Checking ─────────────────────

interface CheckConflictsInput {
  userId: string
  date: string // YYYY-MM-DD
}

interface BusyWindow {
  start: string // ISO timestamp
  end: string // ISO timestamp
}

export const checkGoogleCalendarConflicts = createServerFn({ method: 'POST' })
  .inputValidator((input: CheckConflictsInput) => input)
  .handler(async ({ data, context }): Promise<{ connected: boolean; busyWindows: BusyWindow[] }> => {
    ensureAdminInitialized()

    const userData = await getDocument('users', data.userId)
    if (!userData) {
      return { connected: false, busyWindows: [] }
    }

    const googleCalendar = userData.google_calendar as any

    if (!googleCalendar || !googleCalendar.connected) {
      return { connected: false, busyWindows: [] }
    }

    const env = (context as any)?.cloudflare?.env || {}
    const accessToken = await ensureValidGoogleToken(googleCalendar, data.userId, env)
    if (!accessToken) {
      return { connected: false, busyWindows: [] }
    }

    try {
      const [year, month, day] = data.date.split('-').map(Number)
      const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      const startDate = new Date(targetDate)
      startDate.setUTCDate(startDate.getUTCDate() - 1)
      startDate.setUTCHours(0, 0, 0, 0)
      const endDate = new Date(targetDate)
      endDate.setUTCDate(endDate.getUTCDate() + 1)
      endDate.setUTCHours(23, 59, 59, 999)

      const { createGoogleCalendarProvider } = await import('@/lib/calendar-providers/google')
      const clientId = env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID
      const clientSecret = env.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET

      const provider = createGoogleCalendarProvider({
        GOOGLE_CLIENT_ID: clientId,
        GOOGLE_CLIENT_SECRET: clientSecret,
      })

      const busyWindows = await provider.checkConflicts(accessToken, {
        start: startDate,
        end: endDate,
      })

      const bufferMs = ((userData.settings as any)?.bufferTime || 0) * 60 * 1000

      return {
        connected: true,
        busyWindows: busyWindows.map((window) => ({
          start: new Date(window.start.getTime() - bufferMs).toISOString(),
          end: new Date(window.end.getTime() + bufferMs).toISOString(),
        })),
      }
    } catch (error) {
      console.error('Google Calendar conflict check failed:', error)
      return { connected: false, busyWindows: [] }
    }
  }
)

// ── Google Calendar Events (Debug) ────────────────────────

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  status: string
  calendarId: string
}

export const getGoogleCalendarEvents = createServerFn({ method: 'POST' })
  .inputValidator((input: { userId: string; date: string }) => input)
  .handler(async ({ data, context }): Promise<{ connected: boolean; events: CalendarEvent[]; error?: string }> => {
    ensureAdminInitialized()

    const userData = await getDocument('users', data.userId)
    if (!userData) {
      return { connected: false, events: [], error: 'User not found' }
    }

    const googleCalendar = userData.google_calendar as any
    if (!googleCalendar || !googleCalendar.connected) {
      return { connected: false, events: [], error: 'Google Calendar not connected' }
    }

    const env = (context as any)?.cloudflare?.env || {}
    const accessToken = await ensureValidGoogleToken(googleCalendar, data.userId, env)
    if (!accessToken) {
      return { connected: false, events: [], error: 'Token expired and refresh failed' }
    }

    try {
      const [year, month, day] = data.date.split('-').map(Number)
      const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
      const startDate = new Date(targetDate)
      startDate.setUTCDate(startDate.getUTCDate() - 1)
      const endDate = new Date(targetDate)
      endDate.setUTCDate(endDate.getUTCDate() + 2)

      const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!calendarsResponse.ok) {
        const err = await calendarsResponse.text()
        return { connected: true, events: [], error: `Failed to list calendars: ${err}` }
      }

      const calendarsData = await calendarsResponse.json() as any
      const events: CalendarEvent[] = []

      for (const cal of calendarsData.items) {
        const params = new URLSearchParams({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        })

        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!eventsResponse.ok) continue

        const eventsData = await eventsResponse.json() as any
        for (const event of eventsData.items || []) {
          events.push({
            id: event.id,
            summary: event.summary || '(No title)',
            start: event.start?.dateTime || event.start?.date || '',
            end: event.end?.dateTime || event.end?.date || '',
            status: event.status || 'confirmed',
            calendarId: cal.summary || cal.id,
          })
        }
      }

      events.sort((a, b) => a.start.localeCompare(b.start))

      return { connected: true, events }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      return { connected: true, events: [], error: String(error) }
    }
  }
)
