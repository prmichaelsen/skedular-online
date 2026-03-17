export interface UserProfile {
  uid: string
  email: string
  name: string
  username: string
  phone?: string
  location?: string
  timezone: string
  settings: UserSettings
  ics_feed_enabled?: boolean
  ics_feed_token?: string | null
  ics_feed_token_created_at?: string | null
  google_calendar?: GoogleCalendarConnection | null
  createdAt: string
}

export interface GoogleCalendarConnection {
  connected: boolean
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp
  connected_at: string // ISO timestamp
  last_synced: string | null // ISO timestamp
}

export interface UserSettings {
  defaultDuration: number // minutes (default 30)
  bufferTime: number // minutes between meetings
  maxPerDay: number // 0 = unlimited
  minNotice: number // minutes minimum notice
  hourStart: number // visible hour range start (default 7)
  hourEnd: number // visible hour range end exclusive (default 21)
  slotGranularity: 15 | 30 | 60 // minutes
}

export interface AvailabilityWindow {
  dayOfWeek: number // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number
  endHour: number
}

export interface DateOverride {
  date: string // YYYY-MM-DD
  windows: AvailabilityWindow[]
}

export interface Availability {
  userId: string
  mode: 'soonest' | 'custom'
  windows: AvailabilityWindow[]
  dateOverrides: DateOverride[]
}

export interface Booking {
  id?: string
  userId: string // calendar owner
  bookerEmail: string
  bookerName: string
  notes?: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  timezone: string
  status: 'confirmed' | 'cancelled'
  cancelToken: string
  anonymousUid?: string
  createdAt: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultDuration: 30,
  bufferTime: 0,
  maxPerDay: 0,
  minNotice: 120, // 2 hours
  hourStart: 7,
  hourEnd: 21,
  slotGranularity: 30,
}
