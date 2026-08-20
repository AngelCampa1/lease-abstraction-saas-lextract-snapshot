import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { resetAuthStateSnapshot } from '@/lib/auth-state'

afterEach(() => {
  resetAuthStateSnapshot()
})
