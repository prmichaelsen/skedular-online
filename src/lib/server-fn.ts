import { createServerFn } from '@tanstack/react-start'
import { getFirebaseDb, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from './firebase-client'
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
    const db = getFirebaseDb()

    // Check for conflicts
    const bookingsSnap = await getDocs(
      query(
        collection(db, 'bookings'),
        where('userId', '==', data.userId),
        where('date', '==', data.date),
        where('status', '==', 'confirmed')
      )
    )

    const [sh, sm] = data.startTime.split(':').map(Number)
    const [eh, em] = data.endTime.split(':').map(Number)
    const newStart = sh * 60 + sm
    const newEnd = eh * 60 + em
    const buffer = data.bufferTime

    for (const doc of bookingsSnap.docs) {
      const existing = doc.data() as Booking
      const [bsh, bsm] = existing.startTime.split(':').map(Number)
      const [beh, bem] = existing.endTime.split(':').map(Number)
      const existingStart = bsh * 60 + bsm
      const existingEnd = beh * 60 + bem

      if (newStart < existingEnd + buffer && newEnd + buffer > existingStart) {
        return { success: false, error: 'This time slot has already been booked', code: 409 }
      }
    }

    // No conflict — create the booking
    const ref = await addDoc(collection(db, 'bookings'), {
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
