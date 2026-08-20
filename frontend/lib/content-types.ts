export type FunnelStage = 'tofu' | 'mofu' | 'bofu'

export interface FaqItem {
  question: string
  answer: string
}

export interface ExpertQuoteItem {
  quote: string
  name: string
  title: string
  organization: string
}

export interface SourceItem {
  title: string
  url: string
  publisher: string
  checkedAt: string
}

export interface ContentMeta {
  title: string
  slug: string
  description: string
  publishedAt: string
  updatedAt: string
  author: string
  category: ContentCategory
  silo: SiloId
  tags: string[]
  readingTime: number
  featured: boolean
  funnelStage: FunnelStage
  faq?: FaqItem[]
  quotes?: ExpertQuoteItem[]
  sources?: SourceItem[]
}

export interface ContentItem {
  meta: ContentMeta
  content: string
}

export type ContentCategory = 'articles' | 'guides'

export type SiloId =
  | 'lease-abstraction'
  | 'property-management'
  | 'cam-audit'
  | 'cam-reconciliation'
  | 'compliance'
  | 'due-diligence'
  | 'lease-types'
  | 'lease-negotiation'
  | 'lease-administration'

export interface Silo {
  id: SiloId
  displayName: string
  description: string
  baseUrl: string
}

export interface BreadcrumbItem {
  label: string
  href?: string
}
