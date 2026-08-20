import { Hono } from 'hono'

import type { AppBindings } from '../types'

export const healthRoutes = new Hono<AppBindings>()

healthRoutes.get('/health', (c) => c.json({ status: 'ok' }))
