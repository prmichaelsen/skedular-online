import {
  getFirebaseDb,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
} from './firebase-client'
import type { UserProfile, Availability, Booking, UserSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

// ── Users ──────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb()
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const db = getFirebaseDb()
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as UserProfile
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const user = await getUserByUsername(username)
  return user !== null
}

export async function createUserProfile(
  uid: string,
  data: { email: string; name: string; username: string; timezone: string }
): Promise<UserProfile> {
  const db = getFirebaseDb()
  const profile: UserProfile = {
    uid,
    email: data.email,
    name: data.name,
    username: data.username.toLowerCase(),
    timezone: data.timezone,
    settings: DEFAULT_SETTINGS,
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(db, 'users', uid), profile)
  return profile
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'phone' | 'location' | 'timezone'>>
) {
  const db = getFirebaseDb()
  await updateDoc(doc(db, 'users', uid), data)
}

export async function updateUserSettings(uid: string, settings: Partial<UserSettings>) {
  const db = getFirebaseDb()
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    updates[`settings.${key}`] = value
  }
  await updateDoc(doc(db, 'users', uid), updates)
}

// ── Availability ───────────────────────────────────────────

export async function getAvailability(userId: string): Promise<Availability | null> {
  const db = getFirebaseDb()
  const snap = await getDoc(doc(db, 'availability', userId))
  return snap.exists() ? (snap.data() as Availability) : null
}

export async function saveAvailability(userId: string, availability: Omit<Availability, 'userId'>) {
  const db = getFirebaseDb()
  await setDoc(doc(db, 'availability', userId), { ...availability, userId })
}

// ── Bookings ───────────────────────────────────────────────

export async function createBooking(booking: Omit<Booking, 'id'>): Promise<string> {
  const db = getFirebaseDb()
  const ref = await addDoc(collection(db, 'bookings'), booking)
  return ref.id
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const db = getFirebaseDb()
  const snap = await getDoc(doc(db, 'bookings', bookingId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Booking
}

export async function getBookingsForUser(userId: string, date?: string): Promise<Booking[]> {
  const db = getFirebaseDb()
  let q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    where('status', '==', 'confirmed')
  )
  if (date) {
    q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('status', '==', 'confirmed'),
      where('date', '==', date)
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
}

export async function getBookingByCancelToken(token: string): Promise<Booking | null> {
  const db = getFirebaseDb()
  const q = query(collection(db, 'bookings'), where('cancelToken', '==', token))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Booking
}

export async function cancelBooking(bookingId: string) {
  const db = getFirebaseDb()
  await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' })
}

export async function deleteBooking(bookingId: string) {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, 'bookings', bookingId))
}
