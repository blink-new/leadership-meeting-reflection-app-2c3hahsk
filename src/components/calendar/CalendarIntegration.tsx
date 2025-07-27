import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, Users, RefreshCw, Plus, CheckCircle } from 'lucide-react'
import { blink } from '@/blink/client'
import type { CalendarConnection, CalendarEvent, Meeting } from '@/types'

interface CalendarIntegrationProps {
  onMeetingsImported: () => void
}

export function CalendarIntegration({ onMeetingsImported }: CalendarIntegrationProps) {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())

  const loadCalendarEvents = useCallback(async () => {
    setLoading(true)
    try {
      // Simulate calendar API call - in real implementation, this would call Google/Outlook APIs
      const mockEvents: CalendarEvent[] = [
        {
          id: 'event_1',
          title: 'Weekly Team Standup',
          start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          description: 'Weekly team sync and progress updates',
          attendees: ['john@company.com', 'sarah@company.com', 'mike@company.com'],
          location: 'Conference Room A'
        },
        {
          id: 'event_2',
          title: 'Strategic Planning Session',
          start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          description: 'Q2 strategic planning and goal setting',
          attendees: ['ceo@company.com', 'cto@company.com', 'head-of-product@company.com'],
          location: 'Executive Boardroom'
        },
        {
          id: 'event_3',
          title: 'Client Presentation',
          start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
          description: 'Quarterly business review with key client',
          attendees: ['client@external.com', 'sales@company.com'],
          location: 'Virtual - Zoom'
        },
        {
          id: 'event_4',
          title: 'Performance Review Meeting',
          start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          description: 'Monthly performance review with direct reports',
          attendees: ['employee1@company.com', 'employee2@company.com'],
          location: 'Manager Office'
        }
      ]
      
      setCalendarEvents(mockEvents)
    } catch (error) {
      console.error('Failed to load calendar events:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadConnections = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      const result = await blink.db.calendarConnections.list({
        where: { user_id: user.id }
      })
      setConnections(result)
      
      if (result.length > 0) {
        loadCalendarEvents()
      }
    } catch (error) {
      console.error('Failed to load calendar connections:', error)
    }
  }, [loadCalendarEvents])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])



  const connectCalendar = async (provider: 'google' | 'outlook') => {
    try {
      // In real implementation, this would initiate OAuth flow
      const user = await blink.auth.me()
      const connectionId = `conn_${Date.now()}`
      
      await blink.db.calendarConnections.create({
        id: connectionId,
        user_id: user.id,
        provider,
        calendar_id: `${provider}_calendar_${Date.now()}`,
        calendar_name: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar`,
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      await loadConnections()
    } catch (error) {
      console.error('Failed to connect calendar:', error)
    }
  }

  const importSelectedMeetings = async () => {
    if (selectedEvents.size === 0) return

    setImporting(true)
    try {
      const user = await blink.auth.me()
      const eventsToImport = calendarEvents.filter(event => selectedEvents.has(event.id))

      for (const event of eventsToImport) {
        const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await blink.db.meetings.create({
          id: meetingId,
          title: event.title,
          start_time: event.start,
          end_time: event.end,
          description: event.description || '',
          attendees: JSON.stringify(event.attendees || []),
          location: event.location || '',
          is_selected: 0,
          has_reflection: 0,
          user_id: user.id,
          calendar_event_id: event.id,
          calendar_provider: connections[0]?.provider || 'google',
          created_at: new Date().toISOString()
        })
      }

      setSelectedEvents(new Set())
      onMeetingsImported()
    } catch (error) {
      console.error('Failed to import meetings:', error)
    } finally {
      setImporting(false)
    }
  }

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents)
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId)
    } else {
      newSelection.add(eventId)
    }
    setSelectedEvents(newSelection)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your calendar to automatically import meetings for reflection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connect your calendar to automatically import meetings and schedule reflection reminders.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white text-sm font-bold">G</span>
                      </div>
                      <h3 className="font-medium">Google Calendar</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Calendar to import meetings automatically
                    </p>
                    <Button 
                      onClick={() => connectCalendar('google')}
                      className="w-full flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Connect Google Calendar
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Setup Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to Google Cloud Console</li>
                        <li>Enable Calendar API</li>
                        <li>Create OAuth 2.0 credentials</li>
                        <li>Add authorized redirect URIs</li>
                      </ol>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-sm font-bold">O</span>
                      </div>
                      <h3 className="font-medium">Outlook Calendar</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your Outlook/Office 365 calendar
                    </p>
                    <Button 
                      onClick={() => connectCalendar('outlook')}
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Connect Outlook
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Setup Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to Azure Portal</li>
                        <li>Register new application</li>
                        <li>Configure API permissions</li>
                        <li>Set redirect URIs</li>
                      </ol>
                    </div>
                  </div>
                </Card>
              </div>
              
              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> For demo purposes, connecting will show sample meetings. 
                  In production, this would initiate OAuth flow with your calendar provider.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Connected Calendars</span>
                </div>
                <Button 
                  onClick={loadCalendarEvents}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {connections.map((connection: any) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{connection.calendar_name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{connection.provider}</div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Meetings</CardTitle>
            <CardDescription>
              Select meetings from your calendar to import for reflection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading calendar events...</span>
              </div>
            ) : calendarEvents.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No upcoming meetings found in your calendar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {calendarEvents.map((event) => {
                    const { date, time } = formatDateTime(event.start)
                    const endTime = formatDateTime(event.end).time
                    const isSelected = selectedEvents.has(event.id)
                    
                    return (
                      <div
                        key={event.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleEventSelection(event.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{event.title}</h3>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {date} • {time} - {endTime}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {event.location}
                                </div>
                              )}
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {event.attendees.length} attendees
                                </div>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {selectedEvents.size > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {selectedEvents.size} meeting{selectedEvents.size !== 1 ? 's' : ''} selected
                      </span>
                      <Button 
                        onClick={importSelectedMeetings}
                        disabled={importing}
                        className="flex items-center gap-2"
                      >
                        {importing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Import Selected Meetings
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}