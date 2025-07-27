import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Edit, Trash2, Star, Users, Target, BarChart3, Lock } from 'lucide-react'
import { blink } from '@/blink/client'
import type { QuestionTemplate, TemplateQuestion, UserProfile } from '@/types'

interface QuestionTemplateManagerProps {
  onTemplateSelected?: (templateId: string) => void
}

export function QuestionTemplateManager({ onTemplateSelected }: QuestionTemplateManagerProps) {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionTemplate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [userTier, setUserTier] = useState<'standard' | 'pro'>('standard')

  const loadTemplates = async () => {
    try {
      const user = await blink.auth.me()
      
      // Load user profile to check tier
      const userProfiles = await blink.db.userProfiles.list({
        where: { user_id: user.id }
      })
      
      if (userProfiles.length > 0) {
        setUserTier(userProfiles[0].tier)
      } else {
        // Create default user profile
        await blink.db.userProfiles.create({
          id: `profile_${Date.now()}`,
          user_id: user.id,
          tier: 'standard',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setUserTier('standard')
      }
      
      const result = await blink.db.questionTemplates.list({
        orderBy: { is_default: 'desc', created_at: 'desc' }
      })
      setTemplates(result)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const getTemplateIcon = (templateName: string) => {
    if (templateName.toLowerCase().includes('team')) return Users
    if (templateName.toLowerCase().includes('strategic')) return Target
    if (templateName.toLowerCase().includes('performance')) return BarChart3
    return FileText
  }

  const parseQuestions = (questionsJson: string): TemplateQuestion[] => {
    try {
      return JSON.parse(questionsJson)
    } catch {
      return []
    }
  }

  const handleTemplateSelect = (template: QuestionTemplate) => {
    setSelectedTemplate(template)
    onTemplateSelected?.(template.id)
  }

  const handleCreateTemplate = () => {
    if (userTier === 'standard') {
      // Show upgrade prompt for standard users
      return
    }
    setIsCreateDialogOpen(true)
  }

  const handleEditTemplate = (template: QuestionTemplate) => {
    setSelectedTemplate(template)
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading question templates...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Question Templates
              </CardTitle>
              <CardDescription>
                Pre-built reflection questions for different types of meetings
              </CardDescription>
            </div>
            {userTier === 'pro' ? (
              <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleCreateTemplate} 
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled
                >
                  <Lock className="h-4 w-4" />
                  Create Template (Pro)
                </Button>
                <Button 
                  onClick={() => window.open('https://blink.new/pricing', '_blank')}
                  size="sm"
                  className="bg-accent hover:bg-accent/90"
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userTier === 'standard' && (
            <Alert className="mb-4">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Standard Plan:</strong> You can use pre-built templates but cannot create or edit custom templates. 
                <a href="https://blink.new/pricing" target="_blank" className="text-primary hover:underline ml-1">
                  Upgrade to Pro
                </a> to unlock custom template creation.
              </AlertDescription>
            </Alert>
          )}
          
          {templates.length === 0 ? (
            <Alert>
              <AlertDescription>
                No question templates found. Create your first template to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const Icon = getTemplateIcon(template.name)
                const questions = parseQuestions(template.questions)
                const isSelected = selectedTemplate?.id === template.id
                
                return (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            {Number(template.is_default) > 0 && (
                              <Badge variant="secondary" className="mt-1">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                        {template.user_id !== 'system' && userTier === 'pro' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditTemplate(template)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {template.user_id !== 'system' && userTier === 'standard' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="opacity-50"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{questions.length} questions</span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(getTemplateIcon(selectedTemplate.name), { className: "h-5 w-5" })}
              {selectedTemplate.name}
            </CardTitle>
            <CardDescription>
              {selectedTemplate.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Questions in this template:</h4>
              <div className="space-y-3">
                {parseQuestions(selectedTemplate.questions).map((question, index) => (
                  <div key={question.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Q{index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.type}
                          </Badge>
                          {question.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{question.question}</p>
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="text-xs text-muted-foreground">
                            Options: {question.options.join(', ')}
                          </div>
                        )}
                        {question.type === 'rating' && question.scale && (
                          <div className="text-xs text-muted-foreground">
                            Scale: 1-{question.scale}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Question Template</DialogTitle>
            <DialogDescription>
              Create a new template with custom reflection questions
            </DialogDescription>
          </DialogHeader>
          <CreateTemplateForm 
            onSuccess={() => {
              setIsCreateDialogOpen(false)
              loadTemplates()
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify your custom template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <EditTemplateForm 
              template={selectedTemplate}
              onSuccess={() => {
                setIsEditDialogOpen(false)
                loadTemplates()
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateTemplateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

function CreateTemplateForm({ onSuccess, onCancel }: CreateTemplateFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<TemplateQuestion[]>([
    { id: 'q1', type: 'text', question: '', required: true }
  ])
  const [saving, setSaving] = useState(false)

  const addQuestion = () => {
    const newQuestion: TemplateQuestion = {
      id: `q${questions.length + 1}`,
      type: 'text',
      question: '',
      required: false
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, updates: Partial<TemplateQuestion>) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], ...updates }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const handleSave = async () => {
    if (!name.trim() || questions.some(q => !q.question.trim())) {
      return
    }

    setSaving(true)
    try {
      const user = await blink.auth.me()
      const templateId = `template_${Date.now()}`
      
      await blink.db.questionTemplates.create({
        id: templateId,
        user_id: user.id,
        name: name.trim(),
        description: description.trim(),
        questions: JSON.stringify(questions),
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      onSuccess()
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Team Review"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of when to use this template"
            rows={2}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Questions</h4>
          <Button onClick={addQuestion} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Question {index + 1}</span>
                {questions.length > 1 && (
                  <Button
                    onClick={() => removeQuestion(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
                <div>
                  <Label>Question Text</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(index, { question: e.target.value })}
                    placeholder="Enter your reflection question"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Question Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value: 'text' | 'rating' | 'multiple_choice') => 
                        updateQuestion(index, { type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Response</SelectItem>
                        <SelectItem value="rating">Rating Scale</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={question.required}
                      onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor={`required-${index}`}>Required</Label>
                  </div>
                </div>

                {question.type === 'rating' && (
                  <div>
                    <Label>Rating Scale (1 to X)</Label>
                    <Input
                      type="number"
                      min="3"
                      max="10"
                      value={question.scale || 5}
                      onChange={(e) => updateQuestion(index, { scale: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                {question.type === 'multiple_choice' && (
                  <div>
                    <Label>Options (one per line)</Label>
                    <Textarea
                      value={question.options?.join('\n') || ''}
                      onChange={(e) => updateQuestion(index, { 
                        options: e.target.value.split('\n').filter(o => o.trim()) 
                      })}
                      placeholder="Option 1\nOption 2\nOption 3"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Creating...' : 'Create Template'}
        </Button>
      </div>
    </div>
  )
}

interface EditTemplateFormProps {
  template: QuestionTemplate
  onSuccess: () => void
  onCancel: () => void
}

function EditTemplateForm({ template, onSuccess, onCancel }: EditTemplateFormProps) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || '')
  const [questions, setQuestions] = useState<TemplateQuestion[]>(() => {
    try {
      return JSON.parse(template.questions)
    } catch {
      return []
    }
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || questions.some(q => !q.question.trim())) {
      return
    }

    setSaving(true)
    try {
      await blink.db.questionTemplates.update(template.id, {
        name: name.trim(),
        description: description.trim(),
        questions: JSON.stringify(questions),
        updated_at: new Date().toISOString()
      })

      onSuccess()
    } catch (error) {
      console.error('Failed to update template:', error)
    } finally {
      setSaving(false)
    }
  }

  // Similar form logic as CreateTemplateForm but for editing
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Team Review"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of when to use this template"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}