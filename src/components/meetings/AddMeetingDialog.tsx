import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { blink } from '@/blink/client'
import { toast } from 'sonner'

interface AddMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMeetingAdded: () => void
}

export function AddMeetingDialog({ open, onOpenChange, onMeetingAdded }: AddMeetingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    attendees: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const user = await blink.auth.me()
      
      await blink.db.meetings.create({
        id: `meeting_${Date.now()}`,
        title: formData.title,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description,
        location: formData.location,
        attendees: formData.attendees,
        isSelected: false,
        hasReflection: false,
        userId: user.id,
        createdAt: new Date().toISOString()
      })

      toast.success('Meeting added successfully!')
      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        description: '',
        location: '',
        attendees: ''
      })
      onOpenChange(false)
      onMeetingAdded()
    } catch (error) {
      console.error('Failed to add meeting:', error)
      toast.error('Failed to add meeting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Meeting</DialogTitle>
          <DialogDescription>
            Add a meeting to your calendar for reflection preparation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekly Team Standup"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Conference Room A, Zoom"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees</Label>
            <Input
              id="attendees"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="e.g., John, Sarah, Mike"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Meeting agenda or notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Adding...' : 'Add Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}