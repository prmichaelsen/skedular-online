import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getBookingByCancelToken, cancelBooking } from '@/lib/firestore'
import type { Booking } from '@/lib/types'
import { XCircle } from 'lucide-react'

export const Route = createFileRoute('/cancel/$token')({
  component: CancelPage,
})

function CancelPage() {
  const { token } = Route.useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    ;(async () => {
      const b = await getBookingByCancelToken(token)
      if (!b) {
        setNotFound(true)
      } else if (b.status === 'cancelled') {
        setCancelled(true)
        setBooking(b)
      } else {
        setBooking(b)
      }
      setLoading(false)
    })()
  }, [token])

  const handleCancel = async () => {
    if (!booking?.id) return
    await cancelBooking(booking.id)
    setCancelled(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Booking not found</h1>
          <p className="text-text-secondary text-sm">This cancellation link is invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking cancelled</h1>
          <p className="text-text-secondary">
            Your booking on {booking?.date} at {booking?.startTime} has been cancelled.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold mb-4">Cancel booking?</h1>
        <div className="p-4 border border-border-default rounded-xl mb-6 text-left">
          <p className="text-sm"><strong>Date:</strong> {booking!.date}</p>
          <p className="text-sm"><strong>Time:</strong> {booking!.startTime} – {booking!.endTime}</p>
          <p className="text-sm"><strong>With:</strong> {booking!.bookerName}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="px-4 py-2 border border-border-default rounded-lg text-sm hover:bg-bg-elevated transition-colors"
          >
            Keep booking
          </Link>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  )
}
