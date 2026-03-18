import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { CalendarPainter, type CalendarPainterValue } from '@/components/CalendarPainter'
import { getUserProfile, getAvailability, saveAvailability, getBookingsForUser } from '@/lib/firestore'
import type { UserProfile, Booking } from '@/lib/types'
import { Copy, Check, ExternalLink, Calendar, Clock } from 'lucide-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

// Helper to get the correct host URL
function getHostUrl(): string {
  return 'https://skedular.online'
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [availability, setAvailability] = useState<CalendarPainterValue>({ mode: 'custom', windows: [] })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/login' })
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const p = await getUserProfile(user.uid)
      if (!p) {
        navigate({ to: '/signup' })
        return
      }
      setProfile(p)

      const avail = await getAvailability(user.uid)
      if (avail) {
        if (avail.mode === 'soonest') {
          setAvailability({ mode: 'soonest' })
        } else {
          setAvailability({ mode: 'custom', windows: avail.windows })
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const b = await getBookingsForUser(user.uid)
      setBookings(b.filter((bk) => bk.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)))
    })()
  }, [user, navigate])

  const handleAvailabilityChange = useCallback(
    async (value: CalendarPainterValue) => {
      setAvailability(value)
      if (!user) return
      setSaving(true)
      try {
        if (value.mode === 'soonest') {
          await saveAvailability(user.uid, { mode: 'soonest', windows: [], dateOverrides: [] })
        } else {
          await saveAvailability(user.uid, { mode: 'custom', windows: value.windows, dateOverrides: [] })
        }
      } finally {
        setSaving(false)
      }
    },
    [user]
  )

  const copyLink = () => {
    if (!profile) return
    const url = `${getHostUrl()}/${profile.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Booking link */}
        <div className="mb-8 p-4 bg-bg-elevated rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Your booking link</p>
            <p className="font-medium text-text-primary">
              {getHostUrl()}/{profile.username}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-default rounded-lg text-sm hover:bg-bg-elevated transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={`/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-default rounded-lg text-sm hover:bg-bg-elevated transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          {/* Availability painter */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your availability</h2>
              {saving && <span className="text-xs text-text-muted">Saving...</span>}
            </div>
            <CalendarPainter value={availability} onChange={handleAvailabilityChange} />
          </div>

          {/* Upcoming bookings */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Upcoming bookings</h2>
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-text-muted border border-border-subtle rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming bookings</p>
                <p className="text-xs mt-1">Share your link to start getting booked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 10).map((b) => (
                  <div key={b.id} className="p-3 border border-border-default rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-sm font-medium">{b.date} {b.startTime}–{b.endTime}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{b.bookerName}</p>
                    <p className="text-xs text-text-muted">{b.bookerEmail}</p>
                    {b.notes && <p className="text-xs text-text-muted mt-1 italic">{b.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
