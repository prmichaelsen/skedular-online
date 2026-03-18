import { initializeApp, updateDocument } from '@prmichaelsen/firebase-admin-sdk-v8'
import serviceAccount from '../../skedular-prod-service.json'

let initialized = false

function ensureInitialized() {
  if (!initialized) {
    initializeApp({
      serviceAccount: serviceAccount as any,
      projectId: serviceAccount.project_id,
    })
    initialized = true
  }
}

/**
 * Save Google Calendar OAuth tokens using Firebase Admin SDK
 * This can be called from server-side code (Cloudflare Workers)
 */
export async function saveGoogleCalendarConnectionAdmin(
  uid: string,
  connection: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
) {
  ensureInitialized()

  await updateDocument('users', uid, {
    google_calendar: {
      connected: true,
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expires_at: connection.expires_at,
      connected_at: new Date().toISOString(),
      last_synced: null,
    },
  })
}
