import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { MeetingDetail } from '@/components/meetings/MeetingDetail'
import { AddMeetingDialog } from '@/components/meetings/AddMeetingDialog'
import { CalendarIntegration } from '@/components/calendar/CalendarIntegration'
import { QuestionTemplateManager } from '@/components/templates/QuestionTemplateManager'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { blink } from '@/blink/client'
import type { Meeting, QuestionTemplate } from '@/types'

type View = 'dashboard' | 'meeting' | 'calendar' | 'templates' | 'notifications'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [showAddMeeting, setShowAddMeeting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionTemplate | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setCurrentView('meeting')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setSelectedMeeting(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleMeetingAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleMeetingUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleMeetingsImported = (importedMeetings: Meeting[]) => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleTemplateSelect = (template: QuestionTemplate) => {
    setSelectedTemplate(template)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your leadership dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-primary p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Leadership Reflection</h1>
          <p className="text-gray-600 mb-6">
            Prepare for your meetings with thoughtful reflection questions and get briefed on your responses.
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'dashboard' && (
          <Dashboard
            key={refreshTrigger}
            onAddMeeting={() => setShowAddMeeting(true)}
            onSelectMeeting={handleSelectMeeting}
          />
        )}
        
        {currentView === 'calendar' && (
          <CalendarIntegration
            onMeetingsImported={handleMeetingsImported}
          />
        )}
        
        {currentView === 'templates' && (
          <QuestionTemplateManager
            onTemplateSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />
        )}
        
        {currentView === 'notifications' && (
          <NotificationSettings />
        )}
        
        {currentView === 'meeting' && selectedMeeting && (
          <MeetingDetail
            meeting={selectedMeeting}
            onBack={handleBackToDashboard}
            onMeetingUpdated={handleMeetingUpdated}
          />
        )}
      </main>

      <AddMeetingDialog
        open={showAddMeeting}
        onOpenChange={setShowAddMeeting}
        onMeetingAdded={handleMeetingAdded}
      />

      <Toaster position="top-right" />
    </div>
  )
}

export default App