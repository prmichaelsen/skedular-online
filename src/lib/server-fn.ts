import { createServerFn } from '@tanstack/react-start'
import { getFirebaseDb, doc, getDoc, collection, query, where, getDocs } from './firebase-client'
import { sendEmail } from './email'
import { generateICS, toBase64 } from './ics'
import { confirmationToBooker, confirmationToOwner, cancellationNotification } from './email-templates'
import type { UserProfile, Availability, Booking } from './types'

// ── SSR Data Preload Functions ─────────────────────────

export async function fetchBookingPageData(username: string): Promise<{
  owner: UserProfile | null
  availability: Availability | null
  bookings: Booking[]
}> {
  const db = getFirebaseDb()

  const usersQuery = query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
  const usersSnap = await getDocs(usersQuery)
  if (usersSnap.empty) {
    return { owner: null, availability: null, bookings: [] }
  }
  const owner = usersSnap.docs[0].data() as UserProfile

  const [availSnap, bookingsSnap] = await Promise.all([
    getDoc(doc(db, 'availability', owner.uid)),
    getDocs(
      query(
        collection(db, 'bookings'),
        where('userId', '==', owner.uid),
        where('status', '==', 'confirmed')
      )
    ),
  ])

  const availability = availSnap.exists() ? (availSnap.data() as Availability) : null
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)

  return { owner, availability, bookings }
}

export async function fetchDashboardData(uid: string): Promise<{
  profile: UserProfile | null
  availability: Availability | null
  bookings: Booking[]
}> {
  const db = getFirebaseDb()

  const [profileSnap, availSnap, bookingsSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'availability', uid)),
    getDocs(
      query(
        collection(db, 'bookings'),
        where('userId', '==', uid),
        where('status', '==', 'confirmed')
      )
    ),
  ])

  const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null
  const availability = availSnap.exists() ? (availSnap.data() as Availability) : null
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)

  return { profile, availability, bookings }
}

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

    const baseUrl = process.env.VITE_APP_URL || 'https://skedular.online'
    const cancelUrl = `${baseUrl}/cancel/${data.cancelToken}`
    const bookingPageUrl = `${baseUrl}/${data.username}`
    const fromEmail = 'bookings@skedular.online'

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

export const sendCancellationEmail = createServerFn({ method: 'POST' })
  .inputValidator((input: SendCancellationEmailInput) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.MANDRILL_API_KEY || ''

    if (!apiKey) {
      console.error('MANDRILL_API_KEY not configured')
      return { success: false, error: 'Email not configured' }
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://skedular.online'
    const bookingPageUrl = `${baseUrl}/${data.username}`
    const fromEmail = 'bookings@skedular.online'

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
