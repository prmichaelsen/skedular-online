import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="text-xl font-bold text-primary">
          Skedular
        </Link>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Back to home
        </Link>
      </header>

      {/* Content */}
      <div className="px-6 py-12 max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-text-primary mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-text-secondary">
          <p className="text-sm text-text-muted">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Skedular, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">2. Description of Service</h2>
            <p>
              Skedular is an online scheduling platform that allows users to share their availability and
              enable others to book time slots. The service includes availability management, booking
              confirmations via email, and calendar integration features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">3. User Accounts</h2>
            <p>
              To use Skedular, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your account information is accurate and up-to-date</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">4. Acceptable Use</h2>
            <p>
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Transmit any malicious code or interfere with the service</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Scrape or collect user information without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">5. Bookings and Cancellations</h2>
            <p>
              Calendar owners are responsible for honoring confirmed bookings. Bookers may cancel or
              reschedule using the links provided in confirmation emails. We are not responsible for
              missed appointments or scheduling conflicts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">6. Intellectual Property</h2>
            <p>
              The Skedular service, including its code, design, and branding, is owned by Patrick Michaelsen.
              You may not copy, modify, distribute, or create derivative works without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">7. Disclaimer of Warranties</h2>
            <p>
              Skedular is provided "as is" without warranties of any kind, either express or implied.
              We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Skedular and its creators shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising from your use
              of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of
              these terms or for any other reason. You may terminate your account at any time by contacting
              us at support@skedular.online.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">10. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. We will notify you of significant changes by email
              or through the service. Continued use of Skedular after changes constitutes acceptance of
              the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">11. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which the service is operated, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">12. Contact</h2>
            <p>
              If you have questions about these terms, please contact us at support@skedular.online.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-text-muted text-sm border-t border-border-subtle">
        <div className="flex justify-center gap-6 mb-4">
          <Link to="/privacy" className="hover:text-text-primary transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-text-primary transition-colors">
            Terms
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Skedular. Built by Patrick Michaelsen.</p>
      </footer>
    </div>
  )
}
