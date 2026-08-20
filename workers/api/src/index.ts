import { Hono } from 'hono'

import { corsMiddleware } from './middleware/cors'
import { errorMiddleware, errorResponse } from './middleware/errors'
import { requestIdMiddleware } from './middleware/request-id'
import { authRoutes } from './routes/auth'
import { extractionsRoutes } from './routes/extractions'
import { healthRoutes } from './routes/health'
import { leadsRoutes } from './routes/leads'
import { paymentsRoutes } from './routes/payments'
import { tasksRoutes } from './routes/tasks'
import { userRoutes } from './routes/user'
import { webhooksRoutes } from './routes/webhooks'
import type { AppBindings } from './types'
import type { Env } from './types'
import { handleCleanupBatch } from './queues/cleanup-consumer'
import { handleEmailBatch } from './queues/email-consumer'

export { ExtractionWorkflow } from './workflows/extraction-workflow'
export { ExportWorkflow } from './workflows/export-workflow'

const app = new Hono<AppBindings>()

app.use('*', requestIdMiddleware)
app.use('*', corsMiddleware)
app.use('*', errorMiddleware)
app.onError(errorResponse)

app.route('/', healthRoutes)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/extractions', extractionsRoutes)
app.route('/api/v1/leads', leadsRoutes)
app.route('/api/v1/payments', paymentsRoutes)
app.route('/api/v1/tasks', tasksRoutes)
app.route('/api/v1/user', userRoutes)
app.route('/api/v1/webhooks', webhooksRoutes)

export default {
  fetch(request: Request, env: AppBindings['Bindings'], ctx?: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    if (batch.queue === 'lextract-cleanup') {
      await handleCleanupBatch(batch, env)
      return
    }
    await handleEmailBatch(batch, env)
  },
}
