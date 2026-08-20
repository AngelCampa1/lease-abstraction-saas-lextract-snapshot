import type { ExpertQuoteItem } from '@/lib/content-types'

interface ExpertQuoteProps {
  quote: string
  name: string
  title: string
  organization: string
}

export function ExpertQuote({ quote, name, title, organization }: ExpertQuoteProps) {
  return (
    <blockquote className="my-6 border-l-4 border-primary pl-6 py-1">
      <p className="text-base sm:text-lg italic leading-relaxed text-foreground mb-3">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="text-sm text-muted-foreground">
        <strong className="font-semibold text-foreground not-italic">{name}</strong>
        <span className="mx-1" aria-hidden="true">-</span>
        <span>{title}, {organization}</span>
      </footer>
    </blockquote>
  )
}

interface ExpertQuotesProps {
  quotes: ExpertQuoteItem[]
}

export function ExpertQuotes({ quotes }: ExpertQuotesProps) {
  if (quotes.length === 0) return null
  return (
    <section className="my-8 rounded-lg border bg-muted/30 p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">Industry Perspective</h2>
      <div className="space-y-4">
        {quotes.map((q, i) => (
          <ExpertQuote key={i} {...q} />
        ))}
      </div>
    </section>
  )
}
