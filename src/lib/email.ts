/**
 * Mandrill email client for Cloudflare Workers.
 * Uses the Mandrill REST API directly via fetch (no SDK).
 */

const MANDRILL_API_URL = 'https://mandrillapp.com/api/1.0/messages/send'

interface EmailAttachment {
  type: string // MIME type, e.g. "text/calendar"
  name: string // filename, e.g. "invite.ics"
  content: string // base64-encoded content
}

interface EmailRecipient {
  email: string
  name?: string
}

interface SendEmailOptions {
  to: EmailRecipient[]
  from: { email: string; name: string }
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(
  apiKey: string,
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(MANDRILL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        message: {
          from_email: options.from.email,
          from_name: options.from.name,
          to: options.to.map((r) => ({
            email: r.email,
            name: r.name || r.email,
            type: 'to',
          })),
          subject: options.subject,
          html: options.html,
          attachments: options.attachments?.map((a) => ({
            type: a.type,
            name: a.name,
            content: a.content,
          })),
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `Mandrill API error ${response.status}: ${text}` }
    }

    const result = await response.json() as Array<{ status: string; reject_reason?: string }>
    const rejected = result.filter((r) => r.status === 'rejected')
    if (rejected.length > 0) {
      return { success: false, error: `Rejected: ${rejected.map((r) => r.reject_reason).join(', ')}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
