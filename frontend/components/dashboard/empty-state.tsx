'use client'

import Link from 'next/link'
import { FileUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { HELP_CONTENT } from '@/lib/help-content'
import { PRODUCT_FIELD_COUNT } from '@/lib/product-facts'

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center"
      data-testid="empty-state"
    >
      <div className="rounded-full bg-muted p-4">
        <FileUpIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No extractions yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload a commercial lease PDF. We will extract {PRODUCT_FIELD_COUNT} structured fields in minutes.
      </p>
      <div className="mt-5 w-full max-w-sm rounded-lg border bg-muted/40 p-4 text-left">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-semibold">Start here</p>
          <HelpTooltip label="What happens after I upload?">
            {HELP_CONTENT.firstRun}
          </HelpTooltip>
        </div>
        <ol className="space-y-1 text-sm text-muted-foreground">
          <li>1. Upload a lease PDF</li>
          <li>2. Preview the extracted terms</li>
          <li>3. Unlock and export</li>
        </ol>
      </div>
      <Button asChild className="mt-6">
        <Link href="/upload">Upload Your First Lease</Link>
      </Button>
      <Link
        href="/results/sample"
        className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Or view a sample report first →
      </Link>
    </div>
  )
}

export { EmptyState }
