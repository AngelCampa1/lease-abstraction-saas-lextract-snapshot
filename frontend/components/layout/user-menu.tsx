'use client'

import { useRouter } from 'next/navigation'
import { CircleHelp, LogOut, User, Moon, Sun, Receipt } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/use-auth'
import { useHelpMode } from '@/components/help/help-mode-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { helpModeEnabled, toggleHelpMode } = useHelpMode()
  const router = useRouter()

  const displayName =
    user?.name || user?.email || 'Account'
  const initials = getInitials(displayName)

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // sign-out API may reject due to upstream CSRF config; redirect anyway
    }
    window.location.href = '/login'
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-full"
          aria-label="Open user menu"
          data-testid="user-menu-trigger"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="user-menu-content">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="user-menu-name">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-xs leading-none text-muted-foreground" data-testid="user-menu-email">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push('/profile')}
            data-testid="user-menu-profile"
          >
            <User />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/billing')}
            data-testid="user-menu-billing"
          >
            <Receipt />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} data-testid="user-menu-theme">
            {theme === 'dark' ? <Sun /> : <Moon />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleHelpMode} data-testid="user-menu-help-mode">
            <CircleHelp />
            {helpModeEnabled ? 'Reduce extra help' : 'Show extra help'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          data-testid="user-menu-signout"
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
