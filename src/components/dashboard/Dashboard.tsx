import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { blink } from '@/blink/client'
import type { Meeting } from '@/types'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'

interface DashboardProps {
  onAddMeeting: () => void
  onSelectMeeting: (meeting: Meeting) => void
}

export function Dashboard({ onAddMeeting, onSelectMeeting }: DashboardProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const loadMeetings = async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.meetings.list({
        where: { userId: user.id },
        orderBy: { startTime: 'asc' },
        limit: 20
      })
      
      const formattedMeetings = data.map((meeting: any) => ({
        ...meeting,
        isSelected: Number(meeting.isSelected) > 0,
        hasReflection: Number(meeting.hasReflection) > 0
      }))
      
      setMeetings(formattedMeetings)
    } catch (error) {
      console.error('Failed to load meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await blink.db.meetings.delete(meetingId)
      await loadMeetings() // Refresh the list
    } catch (error) {
      console.error('Failed to delete meeting:', error)
    }
  }

  useEffect(() => {
    loadMeetings()
  }, [])

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d, yyyy')
  }

  const getStatusBadge = (meeting: Meeting) => {
    if (meeting.hasReflection) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (meeting.isSelected) {
      return <Badge className="bg-accent text-accent-foreground">Pending</Badge>
    }
    return <Badge variant="outline">Not Selected</Badge>
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.startTime) > new Date())
  const selectedMeetings = meetings.filter(m => m.isSelected)
  const completedReflections = meetings.filter(m => m.hasReflection)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected for Reflection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedMeetings.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reflections</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReflections.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Meetings</CardTitle>
            <CardDescription>Manage your meeting reflections</CardDescription>
          </div>
          <Button onClick={onAddMeeting} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Meeting
          </Button>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings yet</h3>
              <p className="text-gray-500 mb-4">Add your first meeting to start creating reflection questions.</p>
              <Button onClick={onAddMeeting} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Meeting
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.slice(0, 5).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      {getStatusBadge(meeting)}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{getDateLabel(meeting.startTime)}</span>
                      <span>{format(parseISO(meeting.startTime), 'h:mm a')}</span>
                      {meeting.location && <span>• {meeting.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {meeting.hasReflection && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {meeting.isSelected && !meeting.hasReflection && (
                      <Clock className="h-5 w-5 text-accent" />
                    )}
                    {!meeting.isSelected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteMeeting(meeting.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}