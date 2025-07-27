import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, Mail, Clock, CheckCircle } from 'lucide-react'
import { blink } from '@/blink/client'
import type { NotificationSettings } from '@/types'

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadSettings = async () => {
    try {
      const user = await blink.auth.me()
      const result = await blink.db.notificationSettings.list({
        where: { user_id: user.id }
      })
      
      if (result.length > 0) {
        const settings = result[0]
        // Convert database fields to proper format
        setSettings({
          ...settings,
          email_enabled: Number(settings.email_enabled) > 0,
          reminder_enabled: Number(settings.reminder_enabled) > 0
        })
      } else {
        // Create default settings
        const defaultSettings: Omit<NotificationSettings, 'created_at' | 'updated_at'> = {
          id: `settings_${Date.now()}`,
          user_id: user.id,
          email_enabled: true,
          briefing_minutes_before: 15,
          reminder_enabled: true,
          reminder_hours_before: 24
        }
        
        const created = await blink.db.notificationSettings.create({
          ...defaultSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        
        setSettings(created)
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return

    setSaving(true)
    try {
      const updatedSettings = { ...settings, ...updates }
      
      // Convert boolean values to database format (0/1) for storage
      const dbUpdates = { ...updates }
      if ('email_enabled' in dbUpdates) {
        dbUpdates.email_enabled = dbUpdates.email_enabled ? 1 : 0
      }
      if ('reminder_enabled' in dbUpdates) {
        dbUpdates.reminder_enabled = dbUpdates.reminder_enabled ? 1 : 0
      }
      
      await blink.db.notificationSettings.update(settings.id, {
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })
      
      setSettings(updatedSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to update settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notification settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertDescription>
              Failed to load notification settings. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you receive reflection reminders and meeting briefings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Briefing Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label className="text-base font-medium">Email Briefings</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive your reflection answers via email before meetings
                </p>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => updateSettings({ email_enabled: checked })}
                disabled={saving}
              />
            </div>

            {settings.email_enabled && (
              <div className="ml-6 space-y-3">
                <div className="flex items-center gap-4">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Send briefing</Label>
                  <Select
                    value={settings.briefing_minutes_before.toString()}
                    onValueChange={(value) => updateSettings({ briefing_minutes_before: parseInt(value) })}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">before the meeting</span>
                </div>
                
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    You'll receive an email with your reflection answers to help you prepare for the meeting.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            {/* Reflection Reminder Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <Label className="text-base font-medium">Reflection Reminders</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get reminded to complete reflections for upcoming meetings
                  </p>
                </div>
                <Switch
                  checked={settings.reminder_enabled}
                  onCheckedChange={(checked) => updateSettings({ reminder_enabled: checked })}
                  disabled={saving}
                />
              </div>

              {settings.reminder_enabled && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center gap-4">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Send reminder</Label>
                    <Select
                      value={settings.reminder_hours_before.toString()}
                      onValueChange={(value) => updateSettings({ reminder_hours_before: parseInt(value) })}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">1 day</SelectItem>
                        <SelectItem value="48">2 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">before the meeting</span>
                  </div>
                  
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription>
                      You'll receive a notification to complete your reflection questions for upcoming meetings.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>

          {saved && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-600">
                Settings saved successfully!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Select Meetings</h4>
                <p className="text-sm text-muted-foreground">
                  Choose meetings from your calendar that need reflection
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Complete Reflections</h4>
                <p className="text-sm text-muted-foreground">
                  Answer reflection questions using pre-built templates
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Get Briefed</h4>
                <p className="text-sm text-muted-foreground">
                  Receive your answers via email before the meeting starts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}