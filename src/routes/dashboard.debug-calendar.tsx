import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getGoogleCalendarEvents } from '@/lib/server-fn'
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react'

export const Route = createFileRoute('/dashboard/debug-calendar')({
  component: DebugCalendarPage,
})

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatTime(iso: string): string {
  if (!iso.includes('T')) return 'All day'
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DebugCalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = useState(() => formatDate(new Date()))
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchEvents = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getGoogleCalendarEvents({
          data: { userId: user.uid, date },
        })
        setConnected(result?.connected ?? false)
        setEvents(result?.events ?? [])
        if (result?.error) setError(result.error)
      } catch (err) {
        setError(String(err))
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user, date])

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setDate(formatDate(d))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link
        to="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>

      <h1 className="text-2xl font-bold mb-2">Google Calendar Debug</h1>
      <p className="text-sm text-text-secondary mb-6">
        Shows events pulled from your connected Google Calendar
      </p>

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => shiftDate(-1)}
          className="p-2 border border-border-default rounded-lg hover:bg-bg-elevated"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-border-default rounded-lg"
        />
        <button
          onClick={() => shiftDate(1)}
          className="p-2 border border-border-default rounded-lg hover:bg-bg-elevated"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDate(formatDate(new Date()))}
          className="px-3 py-2 text-sm border border-border-default rounded-lg hover:bg-bg-elevated"
        >
          Today
        </button>
      </div>

      {/* Status */}
      <div className="mb-4 text-sm">
        <span className={connected ? 'text-green-600' : 'text-red-600'}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
        {loading && <span className="ml-2 text-text-muted">Loading...</span>}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Events */}
      {events.length === 0 && !loading && !error && (
        <div className="p-8 text-center text-text-muted border border-border-subtle rounded-xl">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No events found for {date}</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="p-4 border border-border-default rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{event.summary}</p>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatTime(event.start)} - {formatTime(event.end)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    event.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'tentative'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                  <p className="text-xs text-text-muted mt-1">{event.calendarId}</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-text-muted font-mono">
                {event.start} → {event.end}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw data */}
      <details className="mt-8">
        <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary">
          Raw JSON ({events.length} events)
        </summary>
        <pre className="mt-2 p-4 bg-bg-elevated rounded-lg text-xs overflow-auto max-h-96">
          {JSON.stringify(events, null, 2)}
        </pre>
      </details>
    </div>
  )
}
