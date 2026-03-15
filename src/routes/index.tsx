import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { Calendar, Clock, Link as LinkIcon, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="text-xl font-bold text-primary">
          Skedular
        </Link>
        <div className="flex gap-3">
          {loading ? null : user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-6">
          Scheduling made{' '}
          <span className="text-primary">simple</span>
        </h1>
        <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
          Paint your availability on a calendar. Share your link. Let others book time with you.
          No back-and-forth emails.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          Get started free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Paint availability</h3>
            <p className="text-text-secondary text-sm">
              Click and drag on a visual weekly calendar to set when you're free. It takes seconds.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Share your link</h3>
            <p className="text-text-secondary text-sm">
              Get a custom booking URL. Send it to anyone — no account needed to book.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get booked</h3>
            <p className="text-text-secondary text-sm">
              Automatic confirmations with calendar invites. Cancel or reschedule anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-text-muted text-sm">
        <p>&copy; {new Date().getFullYear()} Skedular. Built by Patrick Michaelsen.</p>
      </footer>
    </div>
  )
}
