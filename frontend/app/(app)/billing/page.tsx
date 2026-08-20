'use client'

import { useCallback } from 'react'
import { Receipt, CreditCard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCredits } from '@/hooks/use-credits'
import { usePaymentHistory } from '@/hooks/use-billing-history'
import type { CreditTransaction } from '@/hooks/use-credits'
import type { PaymentHistoryItem } from '@/hooks/use-billing-history'

function formatCurrency(amountCents: number, currency: string): string {
  const safeCurrency = currency && currency.length === 3 ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency.toUpperCase(),
    }).format(amountCents / 100)
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`
  }
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  single: 'Single extraction',
  credit_pack_5: '5-credit pack',
  credit_pack_10: '10-credit pack',
}

function paymentTypeLabel(paymentType: string): string {
  return PAYMENT_TYPE_LABELS[paymentType] ?? 'Purchase'
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface PaymentRowProps {
  payment: PaymentHistoryItem
}

function PaymentRow({ payment }: PaymentRowProps) {
  return (
    <li
      data-testid="payment-row"
      className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div>
        <p className="text-sm font-medium">
          {paymentTypeLabel(payment.payment_type)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(payment.created_at)} · {payment.status}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {formatCurrency(payment.amount_cents, payment.currency)}
        </span>
      </div>
    </li>
  )
}

interface CreditRowProps {
  transaction: CreditTransaction
}

function CreditRow({ transaction }: CreditRowProps) {
  const sign = transaction.amount >= 0 ? '+' : ''
  return (
    <li
      data-testid="credit-transaction-row"
      className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div>
        <p className="text-sm font-medium">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(transaction.created_at)} · Balance after:{' '}
          {transaction.balance_after}
        </p>
      </div>
      <span
        className={`text-sm font-medium ${
          transaction.amount >= 0 ? 'text-emerald-600' : 'text-foreground'
        }`}
      >
        {sign}
        {transaction.amount}
      </span>
    </li>
  )
}

function LoadingList() {
  return (
    <div className="space-y-3" data-testid="billing-loading">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p
      className="py-6 text-center text-sm text-muted-foreground"
      data-testid="billing-empty"
    >
      {message}
    </p>
  )
}

interface ErrorStateProps {
  onRetry: () => void
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-start gap-3 py-4"
      data-testid="billing-error"
      role="alert"
    >
      <p className="text-sm text-destructive">
        We could not load this information. Please try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" />
        Try again
      </Button>
    </div>
  )
}

export default function BillingPage() {
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePaymentHistory()

  const {
    data: creditsData,
    isLoading: creditsLoading,
    isError: creditsError,
    refetch: refetchCredits,
  } = useCredits()

  const handleRetryPayments = useCallback(() => {
    void refetchPayments()
  }, [refetchPayments])

  const handleRetryCredits = useCallback(() => {
    void refetchCredits()
  }, [refetchCredits])

  const payments = paymentsData?.payments ?? []
  const transactions = creditsData?.recent_transactions ?? []

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-dark">
        Billing
      </h1>

      <div className="space-y-6">
        <Card data-testid="payment-history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-muted-foreground" />
              Payment history
            </CardTitle>
            <CardDescription>
              Recent charges for credit packs and one-time unlocks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <LoadingList />
            ) : paymentsError ? (
              <ErrorState onRetry={handleRetryPayments} />
            ) : payments.length === 0 ? (
              <EmptyState message="No payments yet. Purchases will appear here." />
            ) : (
              <ul className="-mt-2">
                {payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card data-testid="credit-history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-muted-foreground" />
              Credit transactions
            </CardTitle>
            <CardDescription>
              Every time credits are granted, used, or refunded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <LoadingList />
            ) : creditsError ? (
              <ErrorState onRetry={handleRetryCredits} />
            ) : transactions.length === 0 ? (
              <EmptyState message="No credit activity yet." />
            ) : (
              <ul className="-mt-2">
                {transactions.map((transaction) => (
                  <CreditRow key={transaction.id} transaction={transaction} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
