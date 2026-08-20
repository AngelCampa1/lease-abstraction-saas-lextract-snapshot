import type { AuthContext } from './services/neon-auth'

export interface Env {
  ALLOWED_ORIGINS?: string
  ENVIRONMENT: 'development' | 'test' | 'staging' | 'production'
  FRONTEND_URL: string
  PUBLIC_API_ORIGIN?: string
  DOCUMENTS_BUCKET?: R2Bucket
  HYPERDRIVE?: Hyperdrive
  NEON_AUTH_BASE_URL?: string
  NEON_AUTH_ISSUER?: string
  NEON_AUTH_JWKS_URL?: string
  STRIPE_API_BASE_URL?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  RESEND_API_KEY?: string
  RESEND_FROM_ADDRESS?: string
  MARKETING_WORKER_URL?: string
  MARKETING_WORKER_SECRET?: string
  OPENROUTER_API_KEY?: string
  OPENROUTER_BASE_URL?: string
  OPENROUTER_COST_CEILING_CENTS?: string
  EXTRACTION_ESCALATION_THRESHOLD?: string
  DOCUMENT_PROXY_SECRET?: string
  TASK_SIGNING_SECRET?: string
  CAMAUDIT_SHARED_KEY?: string
  CAMAUDIT_BASE_URL?: string
  PASS1_MODEL?: string
  PASS1_FALLBACK_MODEL?: string
  PASS2_MODEL?: string
  PASS2_FALLBACK_MODEL?: string
  PASS3_MODEL?: string
  PASS3_FALLBACK_MODEL?: string
  EXTRACTION_WORKFLOW?: Workflow
  EXPORT_WORKFLOW?: Workflow
  CLEANUP_QUEUE?: Queue
  EMAIL_QUEUE?: Queue
}

export interface AppBindings {
  Bindings: Env
  Variables: {
    authContext: AuthContext
    requestId: string
  }
}
