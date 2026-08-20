interface JsonLdProps {
  schema: unknown
}

export function JsonLd({ schema }: JsonLdProps) {
  // Escape < as \u003c to prevent </script> injection (XSS protection)
  const json = JSON.stringify(schema).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
