import { Calendar, User, LogOut, Settings, FileText, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { blink } from '@/blink/client'

interface HeaderProps {
  user: any
  currentView?: string
  onViewChange?: (view: 'dashboard' | 'calendar' | 'templates' | 'notifications') => void
}

export function Header({ user, currentView = 'dashboard', onViewChange }: HeaderProps) {
  const handleLogout = () => {
    blink.auth.logout()
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Calendar },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'notifications', label: 'Settings', icon: Settings }
  ]

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Leadership Reflection</h1>
              <p className="text-sm text-gray-500">Meeting preparation & insights</p>
            </div>
          </div>

          {onViewChange && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentView === item.id
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}