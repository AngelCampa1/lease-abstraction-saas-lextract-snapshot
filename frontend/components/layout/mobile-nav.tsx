'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { NavLinks } from '@/components/layout/nav-links'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) {
        toggleRef.current?.focus()
        restoreFocusRef.current = false
      }
      return
    }

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function getFocusableElements() {
      return Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)
    }

    const focusableElements = getFocusableElements()
    focusableElements[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        restoreFocusRef.current = true
        setOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const elements = getFocusableElements()
      if (elements.length === 0) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function handleClose() {
    restoreFocusRef.current = true
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      <Button
        ref={toggleRef}
        variant="ghost"
        size="icon"
        onClick={() => {
          restoreFocusRef.current = open
          setOpen(!open)
        }}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        data-testid="mobile-nav-toggle"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 top-16 z-40 bg-background/80 backdrop-blur-sm"
                onClick={handleClose}
                data-testid="mobile-nav-overlay"
                aria-hidden="true"
              />
              <motion.div
                ref={panelRef}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-16 bottom-0 z-50 w-72 border-r bg-background p-6 shadow-lg"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation"
                tabIndex={-1}
                data-testid="mobile-nav-panel"
              >
                <NavLinks orientation="vertical" onLinkClick={handleClose} />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
