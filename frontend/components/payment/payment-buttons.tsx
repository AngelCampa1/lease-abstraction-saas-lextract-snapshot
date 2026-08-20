'use client'

import { Button } from '@/components/ui/button'
import { useCreateCheckout } from '@/hooks/use-payment'
import { PRICING, formatPrice } from '@/lib/pricing'

interface PaymentButtonsProps {
  extractionId: string
}

function PaymentButtons({ extractionId }: PaymentButtonsProps) {
  const checkout = useCreateCheckout()

  const getReturnUrl = () => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/results/${extractionId}`
  }

  const handlePaySingle = () => {
    const returnUrl = getReturnUrl()
    checkout.mutate({
      product_type: 'single',
      extraction_id: extractionId,
      success_url: `${returnUrl}?payment=success`,
      cancel_url: `${returnUrl}?payment=cancelled`,
    })
  }

  const handleBuyCredits = () => {
    const returnUrl = getReturnUrl()
    checkout.mutate({
      product_type: 'credit_pack_5',
      success_url: `${returnUrl}?payment=success`,
      cancel_url: `${returnUrl}?payment=cancelled`,
    })
  }

  // checkout.variables holds the request from the in-flight mutation, so we can
  // tell which button initiated the redirect and only show the busy label there.
  const pendingProduct = checkout.isPending
    ? checkout.variables?.product_type
    : undefined

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePaySingle}
        disabled={checkout.isPending}
        size="lg"
        className="w-full"
      >
        {pendingProduct === 'single'
          ? 'Redirecting...'
          : `Unlock for ${formatPrice(PRICING.single.price)}`}
      </Button>
      <Button
        onClick={handleBuyCredits}
        variant="outline"
        disabled={checkout.isPending}
        className="w-full"
      >
        {pendingProduct === 'credit_pack_5'
          ? 'Redirecting...'
          : `Buy 5 credits for ${formatPrice(PRICING.pack5.price)}`}
      </Button>
      {checkout.isError && (
        <p className="text-sm text-destructive">
          Payment failed. Please try again.
        </p>
      )}
    </div>
  )
}

export { PaymentButtons }
