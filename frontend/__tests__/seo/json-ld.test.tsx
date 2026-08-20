import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { JsonLd } from '@/components/seo/json-ld'

describe('JsonLd', () => {
  it('renders a script tag with type application/ld+json', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Test' }
    const { container } = render(<JsonLd schema={schema} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeTruthy()
  })

  it('serializes schema object to JSON', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Lextract' }
    const { container } = render(<JsonLd schema={schema} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const content = script?.innerHTML ?? ''
    expect(content).toContain('"@context"')
    expect(content).toContain('"Lextract"')
  })

  it('escapes < characters to prevent XSS via script injection', () => {
    const schema = { name: '</script><script>alert("xss")</script>' }
    const { container } = render(<JsonLd schema={schema} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const content = script?.innerHTML ?? ''
    expect(content).not.toContain('</script>')
    expect(content).toContain('\\u003c')
  })

  it('handles nested objects', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Lextract?',
          acceptedAnswer: { '@type': 'Answer', text: 'A lease abstraction tool.' },
        },
      ],
    }
    const { container } = render(<JsonLd schema={schema} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const content = script?.innerHTML ?? ''
    const parsed: unknown = JSON.parse(content)
    expect(parsed).toEqual(schema)
  })

  it('handles empty object', () => {
    const { container } = render(<JsonLd schema={{}} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script?.innerHTML).toBe('{}')
  })
})
