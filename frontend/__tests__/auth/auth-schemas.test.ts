/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/auth-schemas'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Email is required')
    }
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'secret123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please enter a valid email')
    }
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password is required')
    }
  })
})

describe('signupSchema', () => {
  const validData = {
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  }

  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty full name', () => {
    const result = signupSchema.safeParse({ ...validData, fullName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Full name is required')
    }
  })

  it('rejects name shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ ...validData, fullName: 'J' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name must be at least 2 characters')
    }
  })

  it('rejects empty email', () => {
    const result = signupSchema.safeParse({ ...validData, email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({ ...validData, email: 'bad' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      ...validData,
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwdIssue = result.error.issues.find((i) => i.path.includes('password'))
      expect(pwdIssue?.message).toBe('Password must be at least 8 characters')
    }
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      ...validData,
      confirmPassword: 'different123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const mismatch = result.error.issues.find((i) => i.path.includes('confirmPassword'))
      expect(mismatch?.message).toBe('Passwords do not match')
    }
  })

  it('rejects empty confirm password', () => {
    const result = signupSchema.safeParse({ ...validData, confirmPassword: '' })
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts matching passwords with at least eight characters', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newpass123',
      confirmPassword: 'newpass123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newpass123',
      confirmPassword: 'different123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects passwords shorter than eight characters', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordIssue = result.error.issues.find((issue) => issue.path.includes('password'))
      expect(passwordIssue?.message).toBe('Password must be at least 8 characters')
    }
  })
})
