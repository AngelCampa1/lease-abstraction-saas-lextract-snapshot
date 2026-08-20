import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createTasksRoutes } from '../routes/tasks'
import {
  buildExportTaskId,
  exportTaskBelongsToOwner,
} from '../domain/task-status'
import { getExportTaskStatus } from '../repositories/tasks'
import type { AppBindings, Env } from '../types'
import { routeTestEnv } from './route-test-helpers'
import { userAuthDependencies } from './task9-helpers'

function app(env: Env = { ...routeTestEnv, TASK_SIGNING_SECRET: 'task-secret' }) {
  const hono = new Hono<AppBindings>()
  hono.route(
    '/api/v1/tasks',
    createTasksRoutes({
      authDependencies: userAuthDependencies,
      getTaskStatus: (taskId) =>
        Promise.resolve(
          taskId.includes('complete')
            ? {
                status: 'complete',
                url: '/download',
                version: 'version-token',
              }
            : { status: 'generating' },
        ),
    }),
  )
  return {
    fetch: (path: string) =>
      hono.fetch(
        new Request(`https://api.lextract.io${path}`, {
          headers: { Authorization: 'Bearer valid-jwt' },
        }),
        env,
      ),
  }
}

describe('task status routes', () => {
  it('builds and verifies owner-scoped export task ids', async () => {
    const taskId = await buildExportTaskId(
      { kind: 'user', userId: 'user-id' },
      'complete:commercial:docx',
      'task-secret',
    )

    const response = await app().fetch(`/api/v1/tasks/${taskId}/status`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'complete',
      task_id: taskId,
      url: '/download',
      version: 'version-token',
    })
  })

  it('returns generating for valid pending tasks and 404 for forged task ids', async () => {
    const taskId = await buildExportTaskId(
      { kind: 'user', userId: 'user-id' },
      'pending:commercial:docx',
      'task-secret',
    )

    const pending = await app().fetch(`/api/v1/tasks/${taskId}/status`)
    const forged = await app().fetch(`/api/v1/tasks/${taskId.slice(0, -1)}x/status`)

    await expect(pending.json()).resolves.toEqual({
      status: 'generating',
      task_id: taskId,
    })
    expect(forged.status).toBe(404)
  })

  it('rejects malformed, cross-owner, unauthenticated, and unconfigured task polls', async () => {
    const otherUserTask = await buildExportTaskId(
      { kind: 'user', userId: 'other-user' },
      'pending:commercial:docx',
      'task-secret',
    )
    const anonymousTask = await buildExportTaskId(
      { kind: 'anonymous', sessionId: 'session-id' },
      'pending:commercial:docx',
      'task-secret',
    )
    const noAuth = new Hono<AppBindings>()
    noAuth.route(
      '/api/v1/tasks',
      createTasksRoutes({
        authDependencies: {
          findAnonymousSession: () => Promise.resolve(null),
          findUserByAuthSubject: () => Promise.resolve(null),
          verifyBearerToken: () => Promise.reject(new Error('unused')),
        },
        getTaskStatus: () => Promise.resolve({ status: 'generating' }),
      }),
    )

    expect(
      await exportTaskBelongsToOwner(
        'not-a-task',
        { kind: 'user', userId: 'user-id' },
        'task-secret',
      ),
    ).toBe(false)
    expect(
      await exportTaskBelongsToOwner(
        anonymousTask,
        { kind: 'anonymous', sessionId: 'session-id' },
        'task-secret',
      ),
    ).toBe(true)
    expect((await app().fetch(`/api/v1/tasks/${otherUserTask}/status`)).status).toBe(404)
    expect(
      (
        await noAuth.fetch(
          new Request('https://api.lextract.io/api/v1/tasks/not-a-task/status'),
          { ...routeTestEnv, TASK_SIGNING_SECRET: 'task-secret' },
        )
      ).status,
    ).toBe(401)
    expect((await app(routeTestEnv).fetch(`/api/v1/tasks/${otherUserTask}/status`)).status).toBe(503)
  })

  it('derives default export task status from R2 object presence', async () => {
    const taskId = await buildExportTaskId(
      { kind: 'user', userId: 'user-id' },
      '11111111-1111-4111-8111-111111111111:commercial:docx:v1',
      'task-secret',
    )
    const pdfTaskId = await buildExportTaskId(
      { kind: 'user', userId: 'user-id' },
      '11111111-1111-4111-8111-111111111111:office:pdf:v2',
      'task-secret',
    )
    const env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: (key: string) =>
          Promise.resolve(
            key.includes('/exports/commercial-v1.docx') ||
              key.includes('/exports/office-v2.pdf')
              ? {}
              : null,
          ),
        list: () => Promise.resolve({ objects: [], truncated: false }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
    }

    await expect(getExportTaskStatus('task-id', routeTestEnv)).resolves.toEqual({
      status: 'generating',
    })
    await expect(
      getExportTaskStatus(
        'export:user:user-id:11111111-1111-4111-8111-111111111111:commercial:xlsx:v2:sig',
        {
          ...routeTestEnv,
          DOCUMENTS_BUCKET: {
            delete: () => Promise.resolve(),
            get: () => Promise.resolve(null),
            list: () => Promise.resolve({ objects: [], truncated: false }),
            put: () => Promise.resolve(null),
          } as unknown as R2Bucket,
        },
      ),
    ).resolves.toEqual({
      status: 'generating',
    })
    await expect(getExportTaskStatus(taskId, env)).resolves.toEqual({
      status: 'complete',
      url: '/api/v1/extractions/11111111-1111-4111-8111-111111111111/export/docx/download?template=commercial&version=v1',
      version: 'v1',
    })
    await expect(getExportTaskStatus(pdfTaskId, env)).resolves.toEqual({
      status: 'complete',
      url: '/api/v1/extractions/11111111-1111-4111-8111-111111111111/export/pdf/download?template=office&version=v2',
      version: 'v2',
    })
  })
})
