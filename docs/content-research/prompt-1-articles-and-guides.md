# Deep Research Prompt: Blog Articles & Resource Guides

> **Usage:** Copy this entire prompt into ChatGPT Deep Research. The output will be MDX files ready to drop into `frontend/content/articles/` and `frontend/content/guides/`.

---

## Prompt

You are a content strategist for **Lextract.io**, an AI-powered commercial lease abstraction platform. Lextract takes a commercial lease PDF, runs it through a 3-pass adversarial AI extraction pipeline (Google Gemini 3 Flash via OpenRouter — native PDF multimodal input, no separate OCR step), and returns 126 structured data fields with confidence scores and red flag detection. It costs $15 per lease.

**Marketing copy rule:** when writing user-facing articles, refer to the system as "AI" or "AI-powered" — do not name the underlying model in marketing copy. Internal docs use the precise stack name; marketing copy stays generic to avoid stale model references.

**Target audience:** Commercial real estate (CRE) professionals — tenant representatives, commercial brokers, property managers, asset managers, and real estate attorneys.

**Brand voice:** Authoritative but approachable. Expert-level content that respects the reader's intelligence. No fluff, no filler. Think "senior analyst briefing" not "marketing blog."

**SEO context:** Lextract is entering the "commercial lease abstraction" keyword space. We need content that ranks for informational queries adjacent to our product.

---

### Deliverable 1: Blog Articles (5 articles)

Write 5 blog articles, each 800-1200 words. For each article, output the complete content in this exact MDX format:

```mdx
---
title: "Article Title Here"
slug: "article-slug-here"
description: "150-160 character meta description with target keyword"
publishedAt: "2026-03-03"
updatedAt: "2026-03-03"
author: "Angel Campa, Founder"
category: "articles"
silo: "lease-abstraction"
tags: ["tag1", "tag2", "tag3"]
readingTime: "X min read"
featured: false
---

Article body in MDX here...
```

**Article topics (write all 5):**

1. **"What Is Commercial Lease Abstraction? A Complete Guide for CRE Professionals"**
   - Target keyword: "commercial lease abstraction"
   - Silo: `lease-abstraction`
   - Cover: definition, why it matters, what gets extracted, who needs it, manual vs automated approaches
   - Include a section on the 99 fields typically extracted (reference Lextract's schema)

2. **"5 Red Flags Every Tenant Rep Should Catch in a Commercial Lease"**
   - Target keyword: "commercial lease red flags"
   - Silo: `lease-abstraction`
   - Cover: hidden escalation clauses, one-sided termination rights, personal guarantee traps, ambiguous CAM definitions, missing audit rights
   - Tie each red flag to real-world consequences

3. **"Manual vs AI Lease Abstraction: Cost, Speed, and Accuracy Compared"**
   - Target keyword: "AI lease abstraction"
   - Silo: `lease-abstraction`
   - Cover: traditional process (paralegals, 4-8 hours per lease, $90-$250), AI approach (minutes, $15), confidence-scored extraction, when each makes sense
   - Be balanced but factual about AI advantages

4. **"How Property Managers Use Lease Abstracts to Prevent Revenue Leakage"**
   - Target keyword: "lease abstract property management"
   - Silo: `property-management`
   - Cover: missed rent escalations, CAM reconciliation errors, lease expiry surprises, how structured data prevents each
   - Include specific dollar-amount examples of revenue leakage

5. **"The Complete Checklist: 99 Fields to Extract from Every Commercial Lease"**
   - Target keyword: "lease abstraction checklist"
   - Silo: `lease-abstraction`
   - Cover: organized by category (parties, premises, financial terms, operating expenses, renewal/termination, insurance, special provisions)
   - Format as a scannable reference document with field groupings

---

### Deliverable 2: Resource Guides (5 guides)

Write 5 resource guides, each 1500-2500 words. These are deeper, more comprehensive reference material. Same MDX frontmatter format as articles, but with `category: "guides"`.

**Guide topics (write all 5):**

1. **"The CRE Professional's Guide to CAM Reconciliation and Audit Rights"**
   - Target keyword: "CAM reconciliation audit"
   - Silo: `cam-audit`
   - Cover: what CAM charges include, reconciliation process, audit rights clauses, common overcharges, how to identify discrepancies, when to request an audit
   - Cross-reference CamAudit.io as the tool for the audit step

2. **"Understanding Commercial Lease Financial Terms: Base Rent to Percentage Rent"**
   - Target keyword: "commercial lease financial terms"
   - Silo: `lease-abstraction`
   - Cover: base rent, percentage rent, CPI escalations, fixed increases, operating expense pass-throughs, NNN vs gross vs modified gross, free rent periods, TI allowances
   - Include calculation examples for each term

3. **"Lease Abstraction for Portfolio Management: Scaling from 10 to 1,000 Leases"**
   - Target keyword: "lease abstraction portfolio"
   - Silo: `property-management`
   - Cover: challenges at scale, data standardization, critical dates management, portfolio-wide analytics, technology requirements, build vs buy decision
   - Address both tenant and landlord perspectives

4. **"Commercial Lease Renewal and Termination: A Legal Reference Guide"**
   - Target keyword: "commercial lease renewal termination"
   - Silo: `lease-abstraction`
   - Cover: renewal option types (automatic, notice-required, fair market value), early termination clauses, holdover provisions, notice requirements, common negotiation points
   - Include notice period timelines and flowcharts in markdown

5. **"Data Security and Compliance in Lease Abstraction: What CRE Firms Need to Know"**
   - Target keyword: "lease abstraction data security"
   - Silo: `lease-abstraction`
   - Cover: sensitive data in leases (financial terms, guarantor info), compliance requirements, vendor evaluation criteria, encryption standards, SOC 2 considerations
   - Position Lextract's approach (no data retention, encrypted processing) as best practice

---

### Formatting Requirements

- Use `##` for major sections, `###` for subsections
- Use bullet lists and numbered lists for scannable content
- Bold key terms on first use
- Include a "Key Takeaways" section at the end of each piece (3-5 bullet points)
- Do NOT include images or image placeholders — we'll add those separately
- Do NOT include calls-to-action in the body — the CTA component is handled by the page template
- Write in second person ("you") where appropriate
- Avoid jargon without explanation — define CRE terms on first use
- Each piece must stand alone as a complete reference

### Content Silos

Use these exact silo values in the frontmatter `silo` field:
- `lease-abstraction` — core lease abstraction content
- `property-management` — property/asset management angle
- `cam-audit` — CAM audit and reconciliation content (cross-sells CamAudit.io)
