import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-text-primary mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-text-secondary">
          <p className="text-sm text-text-muted">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide when creating an account, including your name, email address,
              and timezone. When you create a booking, we collect the booker's name, email, and optional notes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              We use your information to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the Skedular service</li>
              <li>Send booking confirmations and calendar invitations</li>
              <li>Send cancellation and rescheduling notifications</li>
              <li>Improve and optimize our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">3. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Firebase Firestore and protected by Firebase Authentication.
              We implement industry-standard security measures to protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Firebase (Google) for authentication and data storage</li>
              <li>Cloudflare for hosting and content delivery</li>
              <li>Mandrill (Mailchimp) for transactional email delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">5. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your data</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at privacy@skedular.online.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">6. Cookies</h2>
            <p>
              We use cookies to maintain your session and detect your timezone for optimal booking experience.
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">7. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us at privacy@skedular.online.
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
