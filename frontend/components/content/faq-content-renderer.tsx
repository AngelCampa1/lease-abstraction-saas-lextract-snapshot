'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

function MdxLink({
  href,
  children,
}: {
  href?: string
  children?: React.ReactNode
}) {
  if (!href) return <span>{children}</span>
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} className="inline-flex min-h-[44px] items-center">
        {children}
      </Link>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center"
    >
      {children}
    </a>
  )
}

interface FaqContentRendererProps {
  content: string
}

export function FaqContentRenderer({ content }: FaqContentRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => <MdxLink href={href}>{children}</MdxLink>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
