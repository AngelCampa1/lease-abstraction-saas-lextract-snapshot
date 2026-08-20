import Link from 'next/link'

export function AuthorByline() {
  return (
    <div
      className="text-sm text-muted-foreground"
      itemScope
      itemType="https://schema.org/Person"
    >
      Written by{' '}
      <Link
        href="/about/angel-campa"
        className="inline-flex min-h-[44px] items-center font-medium hover:text-foreground transition-colors"
        itemProp="name"
      >
        Angel Campa
      </Link>
      , Founder
    </div>
  )
}
