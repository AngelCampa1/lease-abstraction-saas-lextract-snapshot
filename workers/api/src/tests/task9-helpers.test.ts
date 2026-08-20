import { describe, expect, it } from 'vitest'

import { anonymousAuthDependencies, userAuthDependencies } from './task9-helpers'
import { routeTestEnv } from './route-test-helpers'

describe('Task 9 test helpers', () => {
  it('covers helper auth dependency branches used by route tests', async () => {
    await expect(
      userAuthDependencies.findAnonymousSession('token', routeTestEnv),
    ).resolves.toBeNull()
    await expect(
      anonymousAuthDependencies.findUserByAuthSubject('subject', routeTestEnv),
    ).resolves.toBeNull()
    await expect(
      anonymousAuthDependencies.verifyBearerToken('token', routeTestEnv),
    ).resolves.toEqual({ email: null, subject: 'session-id' })
  })
})
