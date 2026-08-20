import { z } from 'zod'
import type { ExpertQuoteItem, FaqItem, SourceItem } from '@/lib/content-types'

export const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
}) satisfies z.ZodType<FaqItem>

export const expertQuoteItemSchema = z.object({
  quote: z.string().min(10),
  name: z.string().min(1),
  title: z.string().min(1),
  organization: z.string().min(1),
}) satisfies z.ZodType<ExpertQuoteItem>

export const sourceItemSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
  checkedAt: z.string().date('checkedAt must be a valid date (YYYY-MM-DD)'),
}) satisfies z.ZodType<SourceItem>

export const contentFrontmatterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(200, 'Description must be at most 200 characters'),
  publishedAt: z.string().date('publishedAt must be a valid date (YYYY-MM-DD)'),
  updatedAt: z.string().date('updatedAt must be a valid date (YYYY-MM-DD)'),
  author: z.string().min(1, 'Author is required'),
  category: z.enum(['articles', 'guides']),
  silo: z.enum(['lease-abstraction', 'property-management', 'cam-audit', 'cam-reconciliation', 'compliance', 'due-diligence', 'lease-types', 'lease-negotiation', 'lease-administration']),
  tags: z.array(z.string().min(1)),
  readingTime: z.number().int().positive('Reading time must be a positive integer'),
  featured: z.boolean().default(false),
  funnelStage: z.enum(['tofu', 'mofu', 'bofu']).default('mofu'),
  faq: z.array(faqItemSchema).optional(),
  quotes: z.array(expertQuoteItemSchema).optional(),
  sources: z.array(sourceItemSchema).optional(),
})

export type ContentFrontmatter = z.infer<typeof contentFrontmatterSchema>
