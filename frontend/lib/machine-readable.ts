import { formatPrice, PRICING, PROCESSING_TIME } from '@/lib/pricing'
import { SITE_URL } from '@/lib/site-config'
import { PRODUCT_FIELD_COUNT, PRODUCT_RED_FLAG_COUNT } from '@/lib/product-facts'
import { INDEXABLE_FIELDS as FIELDS } from '@/data/fields'
import { INDEXABLE_RED_FLAGS as RED_FLAGS } from '@/data/red-flags'
import { INDEXABLE_CLAUSES as CLAUSES } from '@/data/clauses'
import { INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS } from '@/data/glossary'
import { PRODUCT_FEATURES } from '@/data/features'
import { PUBLIC_KNOWLEDGE } from '@/data/public-knowledge'
import { getAllContent, getContentBySlug } from '@/lib/content'
import type { ContentMeta } from '@/lib/content-types'
import { COMPARISONS } from '@/data/comparisons'
import { CALCULATORS } from '@/data/calculators'
import { TEMPLATES } from '@/data/templates'

interface MachineReadablePricingOffer {
  label: string
  price: number
  credits: number
  perLease: number
}

export function formatMachineReadablePricingLine(
  offer: MachineReadablePricingOffer,
): string {
  if (offer.credits === 1) {
    return `${formatPrice(offer.price)} per lease (single)`
  }

  return `${formatPrice(offer.price)} for ${offer.credits} leases (${formatPrice(
    offer.perLease,
  )} each)`
}

export function buildLlmsTxt(): string {
  const featureLines = PRODUCT_FEATURES.map(
    (feature) =>
      `- [${feature.name}](${SITE_URL}/features/${feature.slug}): ${feature.summary}`
  ).join('\n')

  return `# Lextract

> AI-powered commercial lease abstraction. Upload any commercial lease PDF and receive ${PRODUCT_FIELD_COUNT} structured fields, ${PRODUCT_RED_FLAG_COUNT} red flag checks, and per-field confidence scores in minutes. ${formatPrice(PRICING.single.price)}/lease, no subscription.

## Pricing Facts

- ${formatMachineReadablePricingLine(PRICING.single)}
- ${formatMachineReadablePricingLine(PRICING.pack5)}
- ${formatMachineReadablePricingLine(PRICING.pack10)}
- Processing time: ${PROCESSING_TIME.factual}
- Credits never expire

## Product

- [Lextract - AI Lease Abstraction Software](${SITE_URL}/lease-abstraction-software): Main product page - what Lextract is, how it works, key features
- [Features](${SITE_URL}/features): Problem-first feature hub for Lextract product capabilities
- [AI Lease Abstraction](${SITE_URL}/ai-lease-abstraction): AI-specific page covering the three-pass extraction model (primary, adversarial, escalation)
- [Lease Extraction Software](${SITE_URL}/lease-extraction-software): Structured data extraction from commercial lease PDFs
- [Automated Lease Abstraction](${SITE_URL}/automated-lease-abstraction): Automation angle - replaces 4-8 hours of manual paralegal work per lease
- [Lease Abstraction Services](${SITE_URL}/lease-abstraction-services): AI software vs. outsourced BPO vs. in-house staff comparison
- [Pricing](${SITE_URL}/pricing): ${formatPrice(PRICING.single.price)}/lease single; ${formatPrice(PRICING.pack5.price)} for ${PRICING.pack5.credits} leases; ${formatPrice(PRICING.pack10.price)} for ${PRICING.pack10.credits} leases. Credits never expire.
- [Sample Report](${SITE_URL}/sample-report): Example extraction output - ${PRODUCT_FIELD_COUNT} fields, confidence scores, red flags
- [Upload a Lease](${SITE_URL}/upload): Entry point for new extractions
- [Pricing (machine-readable)](${SITE_URL}/pricing.md): Structured pricing table for AI agents and programmatic comparison
- [Full content index](${SITE_URL}/llms-full.txt): Complete field, clause, red flag, and glossary inventory

## Features

${featureLines}

## Docs

- [Field Reference Library](${SITE_URL}/fields): Curated field library covering the highest-impact published extracted fields; the published inventory is listed in llms-full.txt
- [${PRODUCT_RED_FLAG_COUNT} Automated Red Flags](${SITE_URL}/red-flags): Risk provisions Lextract automatically detects (uncapped CAM, missing audit rights, etc.)
- [Lease Clause Library](${SITE_URL}/clauses): Common commercial lease clauses explained
- [Commercial Lease Glossary](${SITE_URL}/glossary): Curated glossary of high-value lease terms; full term inventory is listed in llms-full.txt
- [Free Lease Tools](${SITE_URL}/tools): Interactive calculators - NNN cost, rent escalation, effective rent, lease comparison
- [FAQ](${SITE_URL}/faq): Answers to common questions about lease abstraction and Lextract

## Comparisons

- [Lextract vs. Alternatives](${SITE_URL}/resources/comparisons): Side-by-side comparisons against competing lease abstraction tools
- [Articles & Guides](${SITE_URL}/resources/articles): Educational content on commercial lease abstraction, due diligence, and CRE
- [What Is Commercial Lease Abstraction?](${SITE_URL}/resources/articles/what-is-commercial-lease-abstraction): Core category definition

## Optional

- [Lease Types](${SITE_URL}/lease-types): NNN, gross, modified gross, ground lease - coverage and differences
- [Industries](${SITE_URL}/industries): Lease abstraction by industry vertical (retail, office, industrial, healthcare, etc.)
- [Use Cases](${SITE_URL}/use-cases): How property managers, brokers, attorneys, and investors use Lextract
- [By Role](${SITE_URL}/for): Lextract for specific roles - property managers, attorneys, investors, brokers
- [Locations](${SITE_URL}/locations): Lease abstraction resources by US city and metro
- [State Laws](${SITE_URL}/resources/states): Commercial lease laws and requirements by US state
- [Templates](${SITE_URL}/templates): Lease abstraction templates and checklists
- [Workflows](${SITE_URL}/workflows): Integration workflows for common property management systems
- [Integrations](${SITE_URL}/integrations): Compatible platforms and export formats
- [Case Studies](${SITE_URL}/case-studies): Real-world examples of Lextract in use
- [Property Types](${SITE_URL}/property-types): Office, retail, industrial, mixed-use lease nuances

## Contact

Founder/sales: ${PUBLIC_KNOWLEDGE.marketing.contacts.founderSales.email}
Support: ${PUBLIC_KNOWLEDGE.marketing.contacts.support.email}
`
}

function formatContentIndexLine(kind: 'articles' | 'guides', item: ContentMeta): string {
  const updated = item.updatedAt ?? item.publishedAt
  const sourceText =
    item.sources !== undefined && item.sources.length > 0
      ? ` Sources: ${item.sources.map((source) => `${escapeMarkdownText(source.publisher)}, checked ${escapeMarkdownText(source.checkedAt)}`).join('; ')}.`
      : ''
  return `- ${escapeMarkdownText(item.title)} -> ${SITE_URL}/resources/${kind}/${item.slug} - Updated: ${escapeMarkdownText(updated)}. ${escapeMarkdownText(item.description)}${sourceText}`
}

function escapeMarkdownText(value: string): string {
  return value
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/([[\]`*_{}#|>])/g, '\\$1')
    .replace(/\)/g, '\\)')
    .trim()
}

function normalizeMarkdownHref(href: string): string {
  if (href.startsWith('/')) {
    return `${SITE_URL}${href}`
  }
  return href
}

function escapeMarkdownUrl(url: string): string {
  return normalizeMarkdownHref(url).replace(/\)/g, '%29').replace(/>/g, '%3E')
}

function stripHtmlForMarkdown(html: string): string {
  return html
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(
      /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href: string, label: string) =>
        `[${escapeMarkdownText(stripHtmlForMarkdown(label))}](${escapeMarkdownUrl(href)})`,
    )
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '_$1_')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function buildArticleMarkdown(slug: string): Promise<string> {
  const { meta, content } = await getContentBySlug('articles', slug)
  const updated = meta.updatedAt ?? meta.publishedAt
  const sources =
    meta.sources !== undefined && meta.sources.length > 0
      ? `\n\n## Sources\n\n${meta.sources
          .map(
            (source) =>
              `- [${escapeMarkdownText(source.title)}](${escapeMarkdownUrl(source.url)}) (${escapeMarkdownText(source.publisher)}, checked ${escapeMarkdownText(source.checkedAt)})`,
          )
          .join('\n')}`
      : ''

  return `# ${escapeMarkdownText(meta.title)}

Canonical: ${SITE_URL}/resources/articles/${meta.slug}
Author: ${escapeMarkdownText(meta.author)}
Published: ${escapeMarkdownText(meta.publishedAt)}
Updated: ${escapeMarkdownText(updated)}
Description: ${escapeMarkdownText(meta.description)}

${stripHtmlForMarkdown(content)}${sources}
`
}

export async function buildLlmsFullTxt(): Promise<string> {
  const articles = await getAllContent('articles')
  const guides = await getAllContent('guides')
  const featureLines = PRODUCT_FEATURES.map(
    (feature) => {
      const proofLines = feature.proof.map((item) => `- ${item}`).join('\n')
      const faqLines = feature.faqs
        .map((faq) => `- ${faq.question}: ${faq.answer}`)
        .join('\n')
      return `### ${feature.name}

Canonical: ${SITE_URL}/features/${feature.slug}
Summary: ${feature.summary}
Problem: ${feature.problem}
Solution: ${feature.solution}
Proof points:
${proofLines}
FAQs:
${faqLines}`
    }
  ).join('\n\n')
  const fieldLines = FIELDS.map(
    (field) =>
      `- ${field.displayLabel} (${field.fieldName}) -> ${SITE_URL}/fields/${field.slug}`
  ).join('\n')
  const redFlagLines = RED_FLAGS.map(
    (flag) => `- ${flag.name} (${flag.ruleId}) -> ${SITE_URL}/red-flags/${flag.slug}`
  ).join('\n')
  const clauseLines = CLAUSES.map(
    (clause) => `- ${clause.name} -> ${SITE_URL}/clauses/${clause.slug}`
  ).join('\n')
  const glossaryLines = GLOSSARY_TERMS.map(
    (term) => `- ${term.term} -> ${SITE_URL}/glossary/${term.slug}`
  ).join('\n')
  const articleLines = articles
    .map((article) => formatContentIndexLine('articles', article))
    .join('\n')
  const guideLines = guides
    .map((guide) => formatContentIndexLine('guides', guide))
    .join('\n')
  const comparisonLines = COMPARISONS.map(
    (comparison) =>
      `- Lextract vs ${comparison.competitor} -> ${SITE_URL}/resources/comparisons/${comparison.competitorSlug} - ${comparison.metaDescription}`
  ).join('\n')
  const calculatorLines = CALCULATORS.map(
    (calculator) =>
      `- ${calculator.title} -> ${SITE_URL}/calculators/${calculator.slug} - ${calculator.metaDescription}`
  ).join('\n')
  const templateLines = TEMPLATES.map(
    (template) =>
      `- ${template.name} -> ${SITE_URL}/templates/${template.slug} - ${template.description}`
  ).join('\n')

  return `# Lextract Full Content Index

Canonical product page: ${SITE_URL}/lease-abstraction-software

## Inventory Counts

- Product extraction schema: ${PRODUCT_FIELD_COUNT} fields per lease
- Published field reference pages: ${FIELDS.length}
- Published red flag pages: ${RED_FLAGS.length}
- Product feature pages: ${PRODUCT_FEATURES.length}
- Clauses: ${CLAUSES.length}
- Glossary terms: ${GLOSSARY_TERMS.length}
- Articles: ${articles.length}
- Guides: ${guides.length}
- Comparisons: ${COMPARISONS.length}
- Calculators: ${CALCULATORS.length}
- Templates: ${TEMPLATES.length}

## Product Features

${featureLines}

## Fields

${fieldLines}

## Red Flags

${redFlagLines}

## Clauses

${clauseLines}

## Glossary

${glossaryLines}

## Articles

${articleLines}

## Guides

${guideLines}

## Comparisons

${comparisonLines}

## Calculators

${calculatorLines}

## Templates

${templateLines}
`
}

export function buildPricingMarkdown(): string {
  return `# Lextract Pricing

Canonical pricing page: ${SITE_URL}/pricing

## Summary

- Product: Lextract
- Category: AI-powered commercial lease abstraction
- Fields included: ${PRODUCT_FIELD_COUNT} structured fields per lease
- Red flag checks included: ${PRODUCT_RED_FLAG_COUNT} automated checks
- Processing time: ${PROCESSING_TIME.comparison}
- Subscription required: No
- Credits expire: No

## Pricing

| Package | Price | Effective price per lease |
| --- | --- | --- |
| ${PRICING.single.label} | ${formatPrice(PRICING.single.price)} | ${formatPrice(PRICING.single.perLease)} |
| ${PRICING.pack5.label} | ${formatPrice(PRICING.pack5.price)} | ${formatPrice(PRICING.pack5.perLease)} |
| ${PRICING.pack10.label} | ${formatPrice(PRICING.pack10.price)} | ${formatPrice(PRICING.pack10.perLease)} |

## Included with every extraction

- ${PRODUCT_FIELD_COUNT} structured lease fields
- ${PRODUCT_RED_FLAG_COUNT} automated red flag checks
- Per-field confidence scoring
- Excel, Word, and PDF outputs
- Vision-based lease reading for scanned and digital PDFs

## Contact

Founder/sales: ${PUBLIC_KNOWLEDGE.marketing.contacts.founderSales.email}
Support: ${PUBLIC_KNOWLEDGE.marketing.contacts.support.email}
`
}
