import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { fetchBookingPageData, createBookingWithConflictCheck, sendBookingConfirmation } from '@/lib/server-fn'
import type { UserProfile, Availability, Booking, AvailabilityWindow } from '@/lib/types'
import { Calendar, Clock, Check, ArrowLeft, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/$username')({
  beforeLoad: async ({ params }) => {
    let initialData: { owner: UserProfile | null; availability: Availability | null; bookings: Booking[] } = {
      owner: null,
      availability: null,
      bookings: [],
    }

    try {
      initialData = await fetchBookingPageData(params.username)
    } catch (error) {
      console.error('Failed to preload booking page data:', error)
    }

    return { initialData }
  },
  component: BookingPage,
})

// ── Helpers ─────────────────────────────────────────────

function generateDates(weeks: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

function getAvailableSlots(
  date: Date,
  windows: AvailabilityWindow[],
  bookings: Booking[],
  duration: number,
  buffer: number,
  minNotice: number
): string[] {
  const dow = date.getDay()
  const dayWindows = windows.filter((w) => w.dayOfWeek === dow)
  if (dayWindows.length === 0) return []

  const dateStr = date.toISOString().split('T')[0]
  const dayBookings = bookings.filter((b) => b.date === dateStr)
  const now = new Date()

  const slots: string[] = []
  for (const w of dayWindows) {
    for (let h = w.startHour; h < w.endHour; h++) {
      for (let m = 0; m < 60; m += duration) {
        if (h === w.endHour - 1 && m + duration > 60) continue
        const startMin = h * 60 + m
        const endMin = startMin + duration

        const slotTime = new Date(date)
        slotTime.setHours(h, m, 0, 0)
        if (slotTime.getTime() - now.getTime() < minNotice * 60 * 1000) continue

        const hasConflict = dayBookings.some((b) => {
          const [bh, bm] = b.startTime.split(':').map(Number)
          const [eh, em] = b.endTime.split(':').map(Number)
          const bStart = bh * 60 + bm
          const bEnd = eh * 60 + em
          return startMin < bEnd + buffer && endMin + buffer > bStart
        })

        if (!hasConflict) {
          const hh = String(Math.floor(startMin / 60)).padStart(2, '0')
          const mm = String(startMin % 60).padStart(2, '0')
          slots.push(`${hh}:${mm}`)
        }
      }
    }
  }
  return slots
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`
}

function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Component ──────────────────────────────────────────

function BookingPage() {
  // SSR data from beforeLoad — no loading spinner needed
  const { initialData } = Route.useRouteContext()
  const owner = initialData.owner
  const availability = initialData.availability
  const bookings = initialData.bookings

  // Booking flow state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [bookerName, setBookerName] = useState('')
  const [bookerEmail, setBookerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const dates = useMemo(() => generateDates(4), [])
  const weekDates = useMemo(() => {
    const start = weekOffset * 7
    return dates.slice(start, start + 7)
  }, [dates, weekOffset])

  const availableSlots = useMemo(() => {
    if (!selectedDate || !availability || !owner || availability.mode === 'soonest') return []
    return getAvailableSlots(
      selectedDate,
      availability.windows,
      bookings,
      owner.settings.defaultDuration,
      owner.settings.bufferTime,
      owner.settings.minNotice
    )
  }, [selectedDate, availability, owner, bookings])

  const handleBook = async () => {
    if (!owner || !selectedDate || !selectedSlot) return
    setSubmitting(true)
    setBookingError(null)
    try {
      const duration = owner.settings.defaultDuration
      const [sh, sm] = selectedSlot.split(':').map(Number)
      const endMin = sh * 60 + sm + duration
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const cancelToken = randomToken()
      const date = selectedDate.toISOString().split('T')[0]

      const result = await createBookingWithConflictCheck({
        data: {
          userId: owner.uid,
          bookerEmail,
          bookerName,
          notes: notes || undefined,
          date,
          startTime: selectedSlot,
          endTime,
          timezone: tz,
          cancelToken,
          bufferTime: owner.settings.bufferTime,
        },
      })

      if (!result.success) {
        setBookingError(result.error)
        setSelectedSlot(null)
        return
      }

      // Send confirmation emails (fire-and-forget, don't block UX)
      sendBookingConfirmation({
        data: {
          ownerName: owner.name,
          ownerEmail: owner.email,
          bookerName,
          bookerEmail,
          date,
          startTime: selectedSlot,
          endTime,
          duration,
          timezone: tz,
          notes: notes || undefined,
          cancelToken,
          username: owner.username,
        },
      }).catch((err) => console.error('Failed to send confirmation email:', err))

      setConfirmed(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Not Found ──

  if (!owner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-300 mb-2">Not found</h1>
          <p className="text-text-secondary">No user with that username</p>
        </div>
      </div>
    )
  }

  // ── Confirmation ──

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking confirmed!</h1>
          <p className="text-text-secondary mb-6">
            Your meeting with {owner.name} on{' '}
            <span className="font-medium text-text-primary">
              {selectedDate!.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>{' '}
            at{' '}
            <span className="font-medium text-text-primary">{formatTime(selectedSlot!)}</span>{' '}
            has been confirmed.
          </p>
          <p className="text-sm text-text-muted">
            A confirmation email will be sent to {bookerEmail}.
          </p>
        </div>
      </div>
    )
  }

  // ── Booking page ──

  const hasAvailability = availability && availability.mode === 'custom' && availability.windows.length > 0

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Owner info */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-primary">
              {owner.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold">{owner.name}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {owner.settings.defaultDuration} min meeting
          </p>
        </div>

        {!hasAvailability ? (
          <div className="text-center p-8 border border-border-default rounded-xl">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary">No availability set yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_280px] gap-6">
            {/* Calendar week view */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  className="p-1.5 hover:bg-bg-elevated rounded-lg disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">
                  {MONTH_NAMES[weekDates[0].getMonth()]} {weekDates[0].getDate()} –{' '}
                  {MONTH_NAMES[weekDates[6].getMonth()]} {weekDates[6].getDate()}
                </span>
                <button
                  onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
                  disabled={weekOffset >= 3}
                  className="p-1.5 hover:bg-bg-elevated rounded-lg disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((d) => {
                  const dow = d.getDay()
                  const dayHasSlots = availability!.windows.some((w) => w.dayOfWeek === dow)
                  const isSelected = selectedDate?.toDateString() === d.toDateString()
                  const isToday = d.toDateString() === new Date().toDateString()
                  const isPast = d < new Date(new Date().setHours(0, 0, 0, 0))

                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => {
                        setSelectedDate(d)
                        setSelectedSlot(null)
                      }}
                      disabled={!dayHasSlots || isPast}
                      className={`
                        p-3 rounded-xl text-center transition-colors
                        ${isSelected ? 'bg-primary text-white' : ''}
                        ${!isSelected && dayHasSlots && !isPast ? 'hover:bg-bg-elevated border border-border-default' : ''}
                        ${!dayHasSlots || isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="text-xs font-medium mb-1">{DAY_NAMES[dow]}</div>
                      <div className={`text-lg font-semibold ${isToday && !isSelected ? 'text-primary' : ''}`}>
                        {d.getDate()}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time slots + booking form */}
            <div>
              {selectedDate ? (
                <>
                  <h3 className="text-sm font-medium mb-3">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-text-muted">No available times</p>
                  ) : selectedSlot ? (
                    <div className="space-y-3">
                      {bookingError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                          {bookingError}
                        </div>
                      )}
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{formatTime(selectedSlot)}</span>
                        </div>
                        <button
                          onClick={() => setSelectedSlot(null)}
                          className="text-xs text-primary mt-1"
                        >
                          Change time
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Your name"
                        required
                        value={bookerName}
                        onChange={(e) => setBookerName(e.target.value)}
                        className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <input
                        type="email"
                        placeholder="Your email"
                        required
                        value={bookerEmail}
                        onChange={(e) => setBookerEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <textarea
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                      <button
                        onClick={handleBook}
                        disabled={submitting || !bookerName || !bookerEmail}
                        className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Booking...' : 'Confirm booking'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className="w-full px-3 py-2 text-sm text-left border border-border-default rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-text-muted text-center p-6">
                  <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Select a date to see available times
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-xs text-text-muted">
          Powered by{' '}
          <a href="/" className="text-primary hover:text-primary-dark">
            Skedular
          </a>
        </div>
      </div>
    </div>
  )
}
