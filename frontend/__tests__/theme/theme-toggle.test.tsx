import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-themes
const mockSetTheme = vi.fn()
let mockTheme = 'system'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    resolvedTheme: mockTheme === 'system' ? 'light' : mockTheme,
  }),
}))

import { ThemeToggle } from '@/components/theme/theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockTheme = 'system'
    mockSetTheme.mockClear()
  })

  it('renders a button element', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('has an accessible aria-label', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label')
    expect(button.getAttribute('aria-label')).toBeTruthy()
  })

  it('cycles from light to dark when clicked in light mode', async () => {
    mockTheme = 'light'
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('cycles from dark to system when clicked in dark mode', async () => {
    mockTheme = 'dark'
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('cycles from system to light when clicked in system mode', async () => {
    mockTheme = 'system'
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('shows Sun icon when theme is light', () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toContain('light')
  })

  it('shows Moon icon when theme is dark', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toContain('dark')
  })

  it('shows Monitor icon when theme is system', () => {
    mockTheme = 'system'
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toContain('system')
  })

  it('uses ghost variant styling (button has ghost variant)', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-variant', 'ghost')
  })

  it('uses icon size (button has icon size)', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-size', 'icon')
  })

  it('renders an SVG icon inside the button', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('accepts and applies additional className', () => {
    render(<ThemeToggle className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  it('defaults to system behavior when theme is undefined or unknown', async () => {
    mockTheme = 'unknown-theme'
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    // Should fall back to system behavior and cycle to light
    expect(button.getAttribute('aria-label')).toContain('system')
    await user.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
