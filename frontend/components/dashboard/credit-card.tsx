'use client'

import Link from 'next/link'
import { CoinsIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { STATUS_COLORS } from '@/lib/design-tokens'

interface CreditCardProps {
  balance: number
}

function CreditCard({ balance }: CreditCardProps) {
  return (
    <Card data-testid="credit-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className={`size-5 ${STATUS_COLORS.warning.icon}`} aria-hidden="true" />
          Credit Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold" data-testid="credit-balance">
          {balance}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {balance === 1 ? 'credit remaining' : 'credits remaining'}
        </p>
        {balance > 0 && (
          <Button asChild className="mt-4 w-full">
            <Link href="/upload" data-testid="upload-with-credits-cta">
              Upload a lease →
            </Link>
          </Button>
        )}
        <Button asChild className="mt-2 w-full" variant="outline">
          <Link href="/pricing">Buy Credits</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export { CreditCard }
