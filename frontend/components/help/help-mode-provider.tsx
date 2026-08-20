'use client'

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'lextract_help_mode'
const HELP_MODE_CHANGE_EVENT = 'lextract_help_mode_change'

interface HelpModeContextValue {
  helpModeEnabled: boolean
  toggleHelpMode: () => void
}

const HelpModeContext = createContext<HelpModeContextValue>({
  helpModeEnabled: true,
  toggleHelpMode: () => undefined,
})

function getHelpModeSnapshot() {
  return localStorage.getItem(STORAGE_KEY) !== 'off'
}

function getServerHelpModeSnapshot() {
  return true
}

function subscribeToHelpModeChanges(onChange: () => void) {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange()
    }
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(HELP_MODE_CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(HELP_MODE_CHANGE_EVENT, onChange)
  }
}

export function HelpModeProvider({ children }: { children: ReactNode }) {
  const helpModeEnabled = useSyncExternalStore(
    subscribeToHelpModeChanges,
    getHelpModeSnapshot,
    getServerHelpModeSnapshot,
  )

  const value = useMemo<HelpModeContextValue>(() => {
    return {
      helpModeEnabled,
      toggleHelpMode: () => {
        const next = !getHelpModeSnapshot()
        localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
        window.dispatchEvent(new Event(HELP_MODE_CHANGE_EVENT))
      },
    }
  }, [helpModeEnabled])

  return (
    <HelpModeContext.Provider value={value}>
      {children}
    </HelpModeContext.Provider>
  )
}

export function useHelpMode() {
  return useContext(HelpModeContext)
}
