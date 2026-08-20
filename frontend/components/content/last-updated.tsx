function formatExactDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface LastUpdatedProps {
  date: string
}

function LastUpdated({ date }: LastUpdatedProps) {
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      <time dateTime={date}>Last updated {formatExactDate(date)}</time>
    </p>
  )
}

export { LastUpdated }
export type { LastUpdatedProps }
