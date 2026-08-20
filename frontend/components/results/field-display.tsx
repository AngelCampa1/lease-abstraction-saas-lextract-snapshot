'use client'

import { motion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import type { TeaserFieldValue } from '@/hooks/use-teaser'

interface FieldDisplayProps extends TeaserFieldValue {
  index: number
}

export function FieldDisplay({ label, value, index }: FieldDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      data-testid="field-display"
    >
      <Card className="h-full">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-foreground" data-testid="field-label">
            {label}
          </p>
          {value !== null ? (
            <p className="mt-1 text-sm text-muted-foreground" data-testid="field-value">
              {value}
            </p>
          ) : (
            <p
              className="mt-1 text-sm italic text-muted-foreground/60"
              data-testid="field-not-found"
            >
              Not found
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
