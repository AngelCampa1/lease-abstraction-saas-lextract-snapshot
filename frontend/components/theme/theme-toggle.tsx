'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

const themeOrder = ['light', 'dark', 'system'] as const
type ThemeName = (typeof themeOrder)[number]

const themeLabels: Record<ThemeName, string> = {
  light: 'Currently light mode, click to switch to dark',
  dark: 'Currently dark mode, click to switch to system',
  system: 'Currently system mode, click to switch to light',
}

const themeIcons: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

interface ThemeToggleProps {
  className?: string
}

function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Render a stable placeholder before mount to avoid hydration mismatch.
  // next-themes resolves theme client-side only, so the icon would differ
  // between server and client without this guard.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label="Toggle theme"
        disabled
      >
        <Monitor className="size-4" />
      </Button>
    )
  }

  // Safe assertion: we fall back to 'system' if theme is not in themeOrder
  const currentTheme = (themeOrder.includes(theme as ThemeName) ? theme : 'system') as ThemeName
  const nextIndex = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length
  const nextTheme = themeOrder[nextIndex]

  const Icon = themeIcons[currentTheme]
  const label = themeLabels[currentTheme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      className={className}
    >
      <Icon className="size-4" />
    </Button>
  )
}

export { ThemeToggle }
