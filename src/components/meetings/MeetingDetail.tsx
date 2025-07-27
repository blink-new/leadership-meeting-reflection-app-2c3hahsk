import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Edit, Trash2, Save, Clock, CheckCircle, FileText, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { blink } from '@/blink/client'
import type { Meeting, ReflectionQuestion, ReflectionAnswer, QuestionTemplate, TemplateQuestion } from '@/types'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface MeetingDetailProps {
  meeting: Meeting
  onBack: () => void
  onMeetingUpdated: () => void
}

export function MeetingDetail({ meeting, onBack, onMeetingUpdated }: MeetingDetailProps) {
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([])
  const [answers, setAnswers] = useState<ReflectionAnswer[]>([])
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({})
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({})

  const loadData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Load templates
      const systemTemplates = await blink.db.questionTemplates.list({
        where: { user_id: 'system', is_default: 1 }
      })
      
      const userTemplates = await blink.db.questionTemplates.list({
        where: { user_id: user.id }
      })

      const allTemplates = [...systemTemplates, ...userTemplates].map(template => ({
        ...template,
        questions: JSON.parse(template.questions as string),
        isDefault: Number(template.is_default) > 0
      }))

      setTemplates(allTemplates)
      
      // Load questions if meeting has a template
      if (meeting.templateId || meeting.template_id) {
        const questionsData = await blink.db.reflectionQuestions.list({
          where: { meeting_id: meeting.id, user_id: user.id },
          orderBy: { order: 'asc' }
        })
        
        // Load answers
        const answersData = await blink.db.reflectionAnswers.list({
          where: { meeting_id: meeting.id, user_id: user.id }
        })
        
        setQuestions(questionsData.map((q: any) => ({
          ...q,
          isRequired: Number(q.isRequired) > 0
        })))
        setAnswers(answersData)
        
        // Initialize answer values
        const initialAnswers: Record<string, string> = {}
        const initialRatings: Record<string, number> = {}
        answersData.forEach((answer: any) => {
          if (answer.rating !== undefined) {
            initialRatings[answer.question_id] = answer.rating
          } else {
            initialAnswers[answer.question_id] = answer.answer
          }
        })
        setAnswerValues(initialAnswers)
        setRatingValues(initialRatings)

        // Find the selected template
        const templateId = meeting.templateId || meeting.template_id
        const template = allTemplates.find(t => t.id === templateId)
        setSelectedTemplate(template || null)
      }
      
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [meeting.id, meeting.templateId, meeting.template_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleSelection = async () => {
    try {
      const newIsSelected = !meeting.isSelected
      
      await blink.db.meetings.update(meeting.id, {
        is_selected: newIsSelected ? 1 : 0
      })
      
      toast.success(newIsSelected ? 'Meeting selected for reflection' : 'Meeting removed from reflection')
      onMeetingUpdated()
    } catch (error) {
      console.error('Failed to update meeting:', error)
      toast.error('Failed to update meeting')
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    try {
      const user = await blink.auth.me()
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      // Update meeting with template
      await blink.db.meetings.update(meeting.id, {
        template_id: templateId
      })

      // Create questions from template
      for (let i = 0; i < template.questions.length; i++) {
        const templateQuestion = template.questions[i]
        await blink.db.reflectionQuestions.create({
          id: `question_${Date.now()}_${i}`,
          meeting_id: meeting.id,
          question: templateQuestion.question,
          type: templateQuestion.type,
          options: templateQuestion.options ? JSON.stringify(templateQuestion.options) : null,
          is_required: templateQuestion.required ? 1 : 0,
          order: i + 1,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
      }

      setSelectedTemplate(template)
      await loadData()
      toast.success('Template applied successfully!')
    } catch (error) {
      console.error('Failed to apply template:', error)
      toast.error('Failed to apply template')
    }
  }

  const handleSaveAnswer = async (questionId: string, answer: string, rating?: number) => {
    try {
      const user = await blink.auth.me()
      const existingAnswer = answers.find(a => a.question_id === questionId)
      
      if (existingAnswer) {
        await blink.db.reflectionAnswers.update(existingAnswer.id, { 
          answer,
          rating: rating || null
        })
      } else {
        await blink.db.reflectionAnswers.create({
          id: `answer_${Date.now()}`,
          question_id: questionId,
          meeting_id: meeting.id,
          answer,
          rating: rating || null,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
      }
      
      // Update meeting to mark as having reflection
      await blink.db.meetings.update(meeting.id, {
        has_reflection: 1
      })
      
      await loadData()
      onMeetingUpdated()
      toast.success('Answer saved successfully!')
    } catch (error) {
      console.error('Failed to save answer:', error)
      toast.error('Failed to save answer')
    }
  }

  const handleSendBriefing = async () => {
    try {
      const user = await blink.auth.me()
      
      // Call the edge function to send briefing email
      const response = await fetch('https://2c3hahsk--send-meeting-briefing.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await blink.auth.getToken()}`
        },
        body: JSON.stringify({
          meetingId: meeting.id,
          userId: user.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Meeting briefing sent to your email!')
      } else {
        toast.error('Failed to send briefing email')
      }
    } catch (error) {
      console.error('Failed to send briefing:', error)
      toast.error('Failed to send briefing email')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          {meeting.hasReflection && (
            <Button onClick={handleSendBriefing} variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Briefing
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <Label htmlFor="select-meeting">Select for Reflection</Label>
            <Switch
              id="select-meeting"
              checked={meeting.isSelected}
              onCheckedChange={handleToggleSelection}
            />
          </div>
        </div>
      </div>

      {/* Meeting Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{meeting.title}</CardTitle>
              <CardDescription className="mt-2">
                {format(parseISO(meeting.startTime), 'EEEE, MMMM d, yyyy • h:mm a')} - {format(parseISO(meeting.endTime), 'h:mm a')}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {meeting.hasReflection && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {meeting.isSelected && !meeting.hasReflection && (
                <Badge className="bg-accent text-accent-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {(meeting.description || meeting.location || meeting.attendees) && (
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              {meeting.location && <p><strong>Location:</strong> {meeting.location}</p>}
              {meeting.attendees && <p><strong>Attendees:</strong> {Array.isArray(meeting.attendees) ? meeting.attendees.join(', ') : meeting.attendees}</p>}
              {meeting.description && <p><strong>Description:</strong> {meeting.description}</p>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Template Selection */}
      {meeting.isSelected && !selectedTemplate && !(meeting.templateId || meeting.template_id) && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Question Template</CardTitle>
            <CardDescription>
              Select a pre-designed set of reflection questions for this meeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        {template.isDefault && (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        {template.questions.length} question{template.questions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reflection Questions */}
      {meeting.isSelected && selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reflection Questions</CardTitle>
                <CardDescription>
                  Template: {selectedTemplate.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading questions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900">
                        {index + 1}. {question.question}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {question.type === 'text' && (
                        <Textarea
                          value={answerValues[question.id] || ''}
                          onChange={(e) => setAnswerValues({ ...answerValues, [question.id]: e.target.value })}
                          placeholder="Enter your reflection..."
                          rows={3}
                        />
                      )}

                      {question.type === 'rating' && (
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">Rating:</span>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => setRatingValues({ ...ratingValues, [question.id]: rating })}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                                  ratingValues[question.id] === rating
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-gray-300 hover:border-primary'
                                }`}
                              >
                                {rating}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.type === 'multiple_choice' && question.options && (
                        <Select
                          value={answerValues[question.id] || ''}
                          onValueChange={(value) => setAnswerValues({ ...answerValues, [question.id]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option..." />
                          </SelectTrigger>
                          <SelectContent>
                            {JSON.parse(question.options).map((option: string, idx: number) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (question.type === 'rating') {
                              handleSaveAnswer(question.id, ratingValues[question.id]?.toString() || '', ratingValues[question.id])
                            } else {
                              handleSaveAnswer(question.id, answerValues[question.id] || '')
                            }
                          }}
                          disabled={
                            question.type === 'rating' 
                              ? !ratingValues[question.id]
                              : !answerValues[question.id]?.trim()
                          }
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Answer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}