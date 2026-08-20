import React from 'react'
import Link from 'next/link'
import { CALLOUT_COLORS } from '@/lib/design-tokens'

function generateAnchorId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('')
  if (React.isValidElement(children) && children.props) {
    const props = children.props as Record<string, unknown>
    if ('children' in props) {
      return extractTextFromChildren(props.children as React.ReactNode)
    }
  }
  return ''
}

interface HeadingProps {
  children: React.ReactNode
}

function HeadingWithAnchor({
  level,
  children,
}: HeadingProps & { level: 2 | 3 | 4 }) {
  const text = extractTextFromChildren(children)
  const id = generateAnchorId(text)
  const Tag = `h${level}` as const

  return (
    <Tag id={id} className="group scroll-mt-24">
      {children}
      <a
        href={`#${id}`}
        aria-label={`Link to ${text}`}
        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
      >
        #
      </a>
    </Tag>
  )
}

function MdxH2({ children }: HeadingProps) {
  return <HeadingWithAnchor level={2}>{children}</HeadingWithAnchor>
}

function MdxH3({ children }: HeadingProps) {
  return <HeadingWithAnchor level={3}>{children}</HeadingWithAnchor>
}

function MdxH4({ children }: HeadingProps) {
  return <HeadingWithAnchor level={4}>{children}</HeadingWithAnchor>
}

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
}

function MdxCodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre className={`overflow-x-auto rounded-lg bg-muted p-4 text-sm ${className ?? ''}`}>
      <code>{children}</code>
    </pre>
  )
}

interface InlineCodeProps {
  children: React.ReactNode
}

function MdxInlineCode({ children }: InlineCodeProps) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
      {children}
    </code>
  )
}

type CalloutVariant = 'info' | 'warning' | 'tip'

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: React.ReactNode
}

const calloutStyles: Record<CalloutVariant, string> = CALLOUT_COLORS

const calloutLabels: Record<CalloutVariant, string> = {
  info: 'Info',
  warning: 'Warning',
  tip: 'Tip',
}

function Callout({ variant = 'info', title, children }: CalloutProps) {
  const label = title ?? calloutLabels[variant]

  return (
    <div
      role="note"
      className={`my-4 rounded-lg border-l-4 p-4 ${calloutStyles[variant]}`}
    >
      <p className="mb-1 font-semibold">{label}</p>
      <div>{children}</div>
    </div>
  )
}

interface TableProps {
  children: React.ReactNode
}

function MdxTable({ children }: TableProps) {
  return (
    <div className="my-4">
      {/* Swipe hint: visible only on small screens where the table may overflow */}
      <p className="mb-1 text-sm text-muted-foreground sm:hidden" aria-hidden="true">
        ← Swipe →
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-base">{children}</table>
      </div>
    </div>
  )
}

function MdxTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b px-4 py-2 text-left font-semibold text-base">{children}</th>
  )
}

function MdxTd({ children }: { children: React.ReactNode }) {
  return <td className="border-b px-4 py-2 text-base">{children}</td>
}

interface MdxLinkProps {
  href?: string
  children: React.ReactNode
}

function MdxLink({ href, children }: MdxLinkProps) {
  if (!href) {
    return <span>{children}</span>
  }

  if (href.startsWith('/') || href.startsWith('#')) {
    return <Link href={href}>{children}</Link>
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export const mdxComponents = {
  h2: MdxH2,
  h3: MdxH3,
  h4: MdxH4,
  pre: MdxCodeBlock,
  code: MdxInlineCode,
  table: MdxTable,
  a: MdxLink,
  th: MdxTh,
  td: MdxTd,
  Callout,
}

export {
  MdxH2,
  MdxH3,
  MdxH4,
  MdxCodeBlock,
  MdxInlineCode,
  MdxLink,
  Callout,
  MdxTable,
  MdxTh,
  MdxTd,
  generateAnchorId,
  extractTextFromChildren,
}
