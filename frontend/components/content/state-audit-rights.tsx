import React from 'react'
import type { StateAuditRights } from '@/data/states'

interface StateAuditRightsSectionProps {
  auditRights: StateAuditRights
}

function StateAuditRightsSection({
  auditRights,
}: StateAuditRightsSectionProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight">
        CAM &amp; Operating Expense Audit Rights
      </h2>
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6">
        <p className="text-sm font-semibold break-words">{auditRights.summary}</p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed break-words">
          {auditRights.details}
        </p>
      </div>
    </section>
  )
}

export { StateAuditRightsSection }
