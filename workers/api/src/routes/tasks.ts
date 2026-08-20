import { Hono } from 'hono'

import {
  exportTaskBelongsToOwner,
} from '../domain/task-status'
import type { TaskStatusResult } from '../domain/task-status'
import { createAuthMiddleware } from '../middleware/auth'
import type { OwnerStorageInput } from '../domain/object-keys'
import { getExportTaskStatus } from '../repositories/tasks'
import type { AuthContext, AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'

export interface TaskRouteDependencies {
  authDependencies?: AuthDependencies
  getTaskStatus(taskId: string, env: Env): Promise<TaskStatusResult>
}

type AuthenticatedContext = Exclude<AuthContext, { kind: 'unauthenticated' }>

function requireAuthenticated(authContext: AuthContext): AuthenticatedContext | Response {
  if (authContext.kind === 'unauthenticated') {
    return Response.json(
      { detail: 'Authentication required: Bearer token or X-Session-Token' },
      { status: 401 },
    )
  }
  return authContext
}

function ownerFromAuth(authContext: AuthenticatedContext): OwnerStorageInput {
  return authContext.kind === 'user'
    ? { kind: 'user', userId: authContext.id }
    : { kind: 'anonymous', sessionId: authContext.id }
}

export function defaultTaskRouteDependencies(): TaskRouteDependencies {
  return {
    getTaskStatus: getExportTaskStatus,
  }
}

export function createTasksRoutes(
  dependencies: TaskRouteDependencies = defaultTaskRouteDependencies(),
): Hono<AppBindings> {
  const routes = new Hono<AppBindings>()
  routes.use('*', createAuthMiddleware(dependencies.authDependencies))

  routes.get('/:taskId/status', async (c) => {
    const auth = requireAuthenticated(c.get('authContext'))
    if (auth instanceof Response) {
      return auth
    }
    const secret = c.env.TASK_SIGNING_SECRET
    if (!secret) {
      return c.json({ detail: 'Task status is not configured' }, 503)
    }
    const taskId = c.req.param('taskId')
    const belongs = await exportTaskBelongsToOwner(taskId, ownerFromAuth(auth), secret)
    if (!belongs) {
      return c.json({ detail: 'Task not found' }, 404)
    }
    const result = await dependencies.getTaskStatus(taskId, c.env)
    return c.json({
      task_id: taskId,
      status: result.status,
      ...(result.url === undefined ? {} : { url: result.url }),
      ...(result.version === undefined ? {} : { version: result.version }),
    })
  })

  return routes
}

export const tasksRoutes = createTasksRoutes()
