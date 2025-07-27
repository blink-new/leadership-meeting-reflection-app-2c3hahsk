export interface Meeting {
  id: string
  title: string
  startTime: string
  endTime: string
  description?: string
  attendees?: string[]
  location?: string
  isSelected: boolean
  hasReflection: boolean
  userId: string
  createdAt: string
  calendarEventId?: string
  calendarProvider?: string
  templateId?: string
  reminderSent?: boolean
}

export interface ReflectionQuestion {
  id: string
  meetingId: string
  question: string
  type: 'text' | 'rating' | 'multiple_choice'
  options?: string[]
  isRequired: boolean
  order: number
  userId: string
  createdAt: string
}

export interface ReflectionAnswer {
  id: string
  questionId: string
  meetingId: string
  answer: string
  rating?: number
  userId: string
  createdAt: string
}

export interface QuestionTemplate {
  id: string
  name: string
  description: string
  questions: TemplateQuestion[]
  isDefault: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface TemplateQuestion {
  id: string
  type: 'text' | 'rating' | 'multiple_choice'
  question: string
  required: boolean
  options?: string[]
  scale?: number
}

export interface CalendarConnection {
  id: string
  userId: string
  provider: 'google' | 'outlook'
  calendarId: string
  calendarName: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  id: string
  userId: string
  emailReminderMinutes: number
  enableEmailReminders: boolean
  enablePushNotifications: boolean
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  attendees?: string[]
  location?: string
  organizer?: string
}

export interface MeetingBriefing {
  id: string
  meetingId: string
  briefingContent: string
  isDelivered: boolean
  deliveredAt?: string
  userId: string
  createdAt: string
}

export interface NotificationQueueItem {
  id: string
  userId: string
  meetingId: string
  type: 'reflection_reminder' | 'pre_meeting_briefing'
  scheduledFor: string
  sent: boolean
  createdAt: string
}

export interface NotificationSettings {
  id: string
  user_id: string
  email_enabled: boolean
  briefing_minutes_before: number
  reminder_enabled: boolean
  reminder_hours_before: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  tier: 'standard' | 'pro'
  created_at: string
  updated_at: string
}