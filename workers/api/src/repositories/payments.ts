import { createConfiguredDb } from './db'
import type { DbPoolLike } from './db'
import type { ProductType } from '../services/stripe'
import type { Env } from '../types'

export interface CheckoutValidationInput {
  userId?: string
  anonymousSessionId?: string
  extractionId?: string
  productType: ProductType
  guestEmail?: string
}

export interface UseCreditInput {
  userId: string
  extractionId: string
}

export interface UseCreditResult {
  newBalance: number
  extractionId: string
}

export interface CreditTransaction {
  id: string
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

export interface CreditsSummary {
  balance: number
  recentTransactions: readonly CreditTransaction[]
}

export interface PaymentRecord {
  id: string
  paymentType: string
  amountCents: number
  currency: string
  status: string
  createdAt: string
}

export interface PaymentHistoryInput {
  userId: string
  page: number
  pageSize: number
}

export interface PaymentHistory {
  payments: readonly PaymentRecord[]
  total: number
  page: number
  pageSize: number
}

export interface WebhookClaimInput {
  eventId: string
  eventType: string
}

export type WebhookClaimResult = 'claimed' | 'processed'

export interface RecordPaymentInput {
  userId: string
  paymentType: ProductType
  amountCents: number
  stripeSessionId: string
  stripePaymentIntentId?: string
}

export interface AddCreditsInput {
  userId: string
  amount: number
  paymentId: string
  description: string
}

export interface SinglePaymentUnlockInput {
  userId?: string
  extractionId: string
  amountCents: number
  stripeSessionId: string
  stripePaymentIntentId?: string
  guestAnonymousSessionId?: string
}

export interface PaymentMutationResult {
  id: string
  created: boolean
}

interface ExtractionPaymentRow {
  id: string
  user_id: string | null
  payment_status: string
}

interface BalanceRow {
  credits_balance: number
}

interface CreditTransactionRow {
  id: string
  amount: number
  balance_after: number
  description: string | null
  created_at: Date | string
}

interface PaymentRecordRow {
  id: string
  payment_type: string
  amount_cents: number
  currency: string | null
  status: string
  created_at: Date | string
}

interface CountRow {
  count: number | string
}

let configuredPaymentDb: ((env: Env) => DbPoolLike) | null = null

export function configurePaymentRepositoryDb(
  createDb: ((env: Env) => DbPoolLike) | null,
): void {
  configuredPaymentDb = createDb
}

function createDb(env: Env): DbPoolLike {
  return configuredPaymentDb === null
    ? createConfiguredDb(env)
    : configuredPaymentDb(env)
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }

  return pool.query.bind(pool)
}

function dateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapCreditTransaction(row: CreditTransactionRow): CreditTransaction {
  return {
    amount: row.amount,
    balanceAfter: row.balance_after,
    createdAt: dateString(row.created_at),
    description: row.description,
    id: row.id,
  }
}

function mapPaymentRecord(row: PaymentRecordRow): PaymentRecord {
  return {
    amountCents: row.amount_cents,
    createdAt: dateString(row.created_at),
    currency: row.currency ?? 'usd',
    id: row.id,
    paymentType: row.payment_type,
    status: row.status,
  }
}

export async function validateCheckoutOwnership(
  input: CheckoutValidationInput,
  env: Env,
): Promise<void> {
  if (input.productType !== 'single') {
    return
  }
  if (!input.extractionId) {
    throw new CheckoutValidationError('extraction_id is required for single purchases')
  }

  const pool = createDb(env)
  try {
    if (input.userId !== undefined) {
      const result = await query(pool)<{ id: string }>(
        `SELECT id
         FROM extractions
         WHERE id = $1
           AND user_id = $2
           AND payment_status = 'unpaid'
           AND deleted_at IS NULL
         LIMIT 1`,
        [input.extractionId, input.userId],
      )
      if (result.rows.length === 0) {
        throw new CheckoutNotFoundError('Extraction not found')
      }
      return
    }

    if (
      input.anonymousSessionId === undefined ||
      input.guestEmail === undefined
    ) {
      throw new CheckoutNotFoundError('Extraction not found')
    }
    const updated = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET guest_email = $3,
           updated_at = NOW()
       WHERE id = $1
         AND anonymous_session_id = $2
         AND user_id IS NULL
         AND payment_status = 'unpaid'
         AND deleted_at IS NULL
       RETURNING id`,
      [input.extractionId, input.anonymousSessionId, input.guestEmail],
    )
    if (updated.rows.length === 0) {
      throw new CheckoutNotFoundError('Extraction not found')
    }
  } finally {
    await pool.end()
  }
}

export async function useCredit(
  input: UseCreditInput,
  env: Env,
): Promise<UseCreditResult> {
  const pool = createDb(env)
  try {
    await query(pool)('BEGIN')
    const extractionResult = await query(pool)<ExtractionPaymentRow>(
      `SELECT id, user_id, payment_status
       FROM extractions
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [input.extractionId],
    )
    const extraction = extractionResult.rows[0]
    if (!extraction || extraction.user_id !== input.userId) {
      await query(pool)('ROLLBACK')
      throw new NotFoundPaymentError('Extraction not found')
    }
    if (extraction.payment_status === 'paid') {
      await query(pool)('ROLLBACK')
      throw new ConflictPaymentError('Extraction is already paid')
    }

    const balanceResult = await query(pool)<BalanceRow>(
      `SELECT credits_balance
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [input.userId],
    )
    const currentBalance = balanceResult.rows[0]?.credits_balance
    if (currentBalance === undefined) {
      await query(pool)('ROLLBACK')
      throw new NotFoundPaymentError('User not found')
    }
    if (currentBalance < 1) {
      await query(pool)('ROLLBACK')
      throw new InsufficientCreditsPaymentError('Insufficient credits')
    }

    const newBalance = currentBalance - 1
    const transactionId = crypto.randomUUID()
    const userUpdate = await query(pool)<{ id: string }>(
      `UPDATE users
       SET credits_balance = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [input.userId, newBalance],
    )
    if (userUpdate.rows.length === 0) {
      await query(pool)('ROLLBACK')
      throw new ConflictPaymentError('Concurrent modification detected - please retry')
    }

    await query(pool)(
      `INSERT INTO credit_transactions
         (id, user_id, extraction_id, amount, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        transactionId,
        input.userId,
        input.extractionId,
        -1,
        newBalance,
        'Credit used for extraction',
      ],
    )
    const extractionUpdate = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET payment_status = 'paid',
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND payment_status = 'unpaid'
       RETURNING id`,
      [input.extractionId, input.userId],
    )
    if (extractionUpdate.rows.length === 0) {
      await query(pool)('ROLLBACK')
      throw new ConflictPaymentError('Concurrent modification detected - please retry')
    }
    await query(pool)('COMMIT')

    return { extractionId: input.extractionId, newBalance }
  } catch (error) {
    if (
      !(error instanceof NotFoundPaymentError) &&
      !(error instanceof ConflictPaymentError) &&
      !(error instanceof InsufficientCreditsPaymentError)
    ) {
      await query(pool)('ROLLBACK')
    }
    throw error
  } finally {
    await pool.end()
  }
}

export async function getCredits(userId: string, env: Env): Promise<CreditsSummary> {
  const pool = createDb(env)
  try {
    const balance = await query(pool)<BalanceRow>(
      `SELECT credits_balance
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    )
    const transactions = await query(pool)<CreditTransactionRow>(
      `SELECT id, amount, balance_after, description, created_at
       FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId],
    )

    return {
      balance: balance.rows[0]?.credits_balance ?? 0,
      recentTransactions: transactions.rows.map(mapCreditTransaction),
    }
  } finally {
    await pool.end()
  }
}

export async function getPaymentHistory(
  input: PaymentHistoryInput,
  env: Env,
): Promise<PaymentHistory> {
  const pool = createDb(env)
  try {
    const total = await query(pool)<CountRow>(
      `SELECT COUNT(*) AS count
       FROM payments
       WHERE user_id = $1`,
      [input.userId],
    )
    const payments = await query(pool)<PaymentRecordRow>(
      `SELECT id, payment_type, amount_cents, currency, status, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [input.userId, input.pageSize, (input.page - 1) * input.pageSize],
    )

    return {
      page: input.page,
      pageSize: input.pageSize,
      payments: payments.rows.map(mapPaymentRecord),
      total: Number(total.rows[0]?.count ?? 0),
    }
  } finally {
    await pool.end()
  }
}

export async function claimWebhookEvent(
  input: WebhookClaimInput,
  env: Env,
): Promise<WebhookClaimResult> {
  const pool = createDb(env)
  try {
    await query(pool)('BEGIN')
    const inserted = await query(pool)<{ id: string }>(
      `INSERT INTO stripe_webhook_events
         (id, event_type, processed_at, failed_at, failure_reason, claimed_at)
       VALUES ($1, $2, NULL, NULL, NULL, NOW())
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [input.eventId, input.eventType],
    )
    if (inserted.rows.length > 0) {
      await query(pool)('COMMIT')
      return 'claimed'
    }

    const existing = await query(pool)<{
      processed_at: Date | string | null
      failed_at: Date | string | null
    }>(
      `SELECT processed_at, failed_at
       FROM stripe_webhook_events
       WHERE id = $1
       FOR UPDATE`,
      [input.eventId],
    )
    const row = existing.rows[0]
    if (row === undefined || row.processed_at !== null || row.failed_at !== null) {
      await query(pool)('COMMIT')
      return 'processed'
    }

    await query(pool)(
      `UPDATE stripe_webhook_events
       SET claimed_at = NOW(),
           event_type = $2
       WHERE id = $1`,
      [input.eventId, input.eventType],
    )
    await query(pool)('COMMIT')
    return 'claimed'
  } catch (error) {
    await query(pool)('ROLLBACK')
    throw error
  } finally {
    await pool.end()
  }
}

export async function recordPayment(
  input: RecordPaymentInput,
  env: Env,
): Promise<PaymentMutationResult> {
  const pool = createDb(env)
  try {
    const existing = await query(pool)<{ id: string }>(
      `SELECT id
       FROM payments
       WHERE stripe_checkout_session_id = $1
       LIMIT 1`,
      [input.stripeSessionId],
    )
    if (existing.rows[0]) {
      return { created: false, id: existing.rows[0].id }
    }

    const paymentId = crypto.randomUUID()
    const result = await query(pool)<{ id: string }>(
      `INSERT INTO payments
          (id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
           payment_type, amount_cents, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'usd', 'completed')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        paymentId,
        input.userId ?? null,
        input.stripeSessionId,
        input.stripePaymentIntentId ?? null,
        input.paymentType,
        input.amountCents,
      ],
    )
    const inserted = result.rows[0]
    if (inserted) {
      return { created: true, id: inserted.id }
    }

    const afterRace = await query(pool)<{ id: string }>(
      `SELECT id
       FROM payments
       WHERE stripe_checkout_session_id = $1
       LIMIT 1`,
      [input.stripeSessionId],
    )
    if (!afterRace.rows[0]) {
      throw new ConflictPaymentError('Payment could not be recorded')
    }
    return { created: false, id: afterRace.rows[0].id }
  } finally {
    await pool.end()
  }
}

export async function addCredits(
  input: AddCreditsInput,
  env: Env,
): Promise<PaymentMutationResult> {
  if (input.amount <= 0) {
    throw new CheckoutValidationError('Credit amount must be positive')
  }

  const pool = createDb(env)
  try {
    await query(pool)('BEGIN')
    const balance = await query(pool)<BalanceRow>(
      `SELECT credits_balance
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [input.userId],
    )
    const currentBalance = balance.rows[0]?.credits_balance
    if (currentBalance === undefined) {
      await query(pool)('ROLLBACK')
      throw new NotFoundPaymentError('User not found')
    }

    const existingGrant = await query(pool)<{ id: string }>(
      `SELECT id
       FROM credit_transactions
       WHERE payment_id = $1
       LIMIT 1`,
      [input.paymentId],
    )
    if (existingGrant.rows[0]) {
      await query(pool)('COMMIT')
      return { created: false, id: existingGrant.rows[0].id }
    }

    const newBalance = currentBalance + input.amount
    const transactionId = crypto.randomUUID()
    await query(pool)(
      `UPDATE users
       SET credits_balance = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [input.userId, newBalance],
    )
    await query(pool)(
      `INSERT INTO credit_transactions
         (id, user_id, payment_id, amount, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        transactionId,
        input.userId,
        input.paymentId,
        input.amount,
        newBalance,
        input.description,
      ],
    )
    await query(pool)('COMMIT')
    return { created: true, id: transactionId }
  } catch (error) {
    if (!(error instanceof NotFoundPaymentError)) {
      await query(pool)('ROLLBACK')
    }
    throw error
  } finally {
    await pool.end()
  }
}

export async function recordSinglePaymentAndUnlock(
  input: SinglePaymentUnlockInput,
  env: Env,
): Promise<PaymentMutationResult> {
  const pool = createDb(env)
  try {
    await query(pool)('BEGIN')
    const existing = await query(pool)<{ id: string }>(
      `SELECT id
       FROM payments
       WHERE stripe_checkout_session_id = $1
       LIMIT 1`,
      [input.stripeSessionId],
    )
    const existingPaymentId = existing.rows[0]?.id
    const paymentId = existingPaymentId ?? crypto.randomUUID()
    const paymentCreated = existingPaymentId === undefined
    if (paymentCreated) {
      await query(pool)(
        `INSERT INTO payments
           (id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
            payment_type, amount_cents, currency, status)
         VALUES ($1, $2, $3, $4, 'single', $5, 'usd', 'completed')`,
        [
          paymentId,
          input.userId ?? null,
          input.stripeSessionId,
          input.stripePaymentIntentId ?? null,
          input.amountCents,
        ],
      )
    }

    const params: unknown[] = [input.extractionId, input.userId ?? null, paymentId]
    let ownershipClause = 'AND user_id = $2'
    let ownerUpdate = 'user_id = $2, anonymous_session_id = NULL,'
    if (input.guestAnonymousSessionId !== undefined) {
      params.push(input.guestAnonymousSessionId)
      ownershipClause = 'AND anonymous_session_id = $4 AND user_id IS NULL'
      ownerUpdate = ''
    } else if (input.userId === undefined) {
      throw new CheckoutValidationError('userId is required for registered single purchases')
    }
    const update = await query(pool)<{ id: string }>(
      `UPDATE extractions
       SET ${ownerUpdate}
           payment_status = 'paid',
           payment_id = $3,
           updated_at = NOW()
       WHERE id = $1
         ${ownershipClause}
         AND payment_status = 'unpaid'
       RETURNING id`,
      params,
    )
    if (update.rows.length === 0 && paymentCreated) {
      await query(pool)('ROLLBACK')
      throw new NotFoundPaymentError('Extraction not found')
    }

    await query(pool)('COMMIT')
    return { created: paymentCreated, id: paymentId }
  } catch (error) {
    if (!(error instanceof NotFoundPaymentError)) {
      await query(pool)('ROLLBACK')
    }
    throw error
  } finally {
    await pool.end()
  }
}

export async function completeWebhookEvent(eventId: string, env: Env): Promise<void> {
  const pool = createDb(env)
  try {
    await query(pool)(
      `UPDATE stripe_webhook_events
       SET processed_at = NOW()
       WHERE id = $1`,
      [eventId],
    )
  } finally {
    await pool.end()
  }
}

export async function failWebhookEvent(
  eventId: string,
  reason: string,
  env: Env,
): Promise<void> {
  const pool = createDb(env)
  try {
    await query(pool)(
      `UPDATE stripe_webhook_events
       SET failed_at = NOW(),
           failure_reason = $2
       WHERE id = $1`,
      [eventId, reason.slice(0, 1000)],
    )
  } finally {
    await pool.end()
  }
}

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckoutValidationError'
  }
}

export class CheckoutNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckoutNotFoundError'
  }
}

export class NotFoundPaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundPaymentError'
  }
}

export class ConflictPaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictPaymentError'
  }
}

export class InsufficientCreditsPaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InsufficientCreditsPaymentError'
  }
}
