# Deep Research Prompt: Glossary Terms & State Pages

> **Usage:** Copy this entire prompt into ChatGPT Deep Research. The output will be TypeScript data structures ready to paste into `frontend/data/glossary.ts` and `frontend/data/states.ts`.

---

## Prompt

You are a content strategist for **Lextract.io**, an AI-powered commercial lease abstraction platform that extracts 126 structured fields from commercial lease PDFs. Target audience: CRE professionals (tenant reps, brokers, property managers, attorneys).

---

### Deliverable 1: Glossary Terms (25+ terms)

Create a TypeScript array of commercial lease glossary terms. Each term should have a plain-English definition accessible to someone new to CRE, plus related terms for internal linking.

Output the data in this exact TypeScript format:

```typescript
export interface GlossaryTerm {
  term: string
  slug: string
  definition: string        // 2-4 sentences, plain English
  extendedDefinition: string // 1-2 paragraphs, more detail + examples
  relatedTerms: string[]    // slugs of related terms in this glossary
  seeAlso: string[]         // labels for external concepts (not linked)
  category: 'financial' | 'legal' | 'operational' | 'parties' | 'property'
}

export const glossaryTerms: GlossaryTerm[] = [
  // ... terms here
]
```

**Required terms (include all 25+):**

**Financial (8+ terms):**
1. Base Rent
2. Percentage Rent
3. CPI Escalation
4. Operating Expense Pass-Through
5. CAM Charges (Common Area Maintenance)
6. NNN Lease (Triple Net)
7. Gross Lease
8. Tenant Improvement Allowance (TI Allowance)

**Legal (7+ terms):**
9. Estoppel Certificate
10. Subordination, Non-Disturbance & Attornment (SNDA)
11. Personal Guarantee
12. Assignment and Subletting
13. Force Majeure
14. Holdover Provision
15. Right of First Refusal (ROFR)

**Operational (6+ terms):**
16. Lease Abstract
17. Lease Abstraction
18. Critical Date
19. Rent Escalation Schedule
20. CAM Reconciliation
21. Audit Rights

**Parties (2+ terms):**
22. Tenant Representative (Tenant Rep)
23. Property Manager

**Property (2+ terms):**
24. Rentable Square Footage (RSF)
25. Usable Square Footage (USF)

Add additional relevant terms beyond the 25 minimum if they're important for commercial lease professionals.

**Writing guidelines:**
- `definition`: Imagine explaining to a smart person who doesn't work in CRE. 2-4 clear sentences.
- `extendedDefinition`: More detail — typical values, calculation examples, negotiation context, what to watch out for.
- `relatedTerms`: Use slugs from this same list (e.g., `"base-rent"`, `"cam-charges"`)
- `category`: Pick the primary category even if a term could fit multiple

---

### Deliverable 2: State Commercial Landlord-Tenant Law Data (10 states)

Create a TypeScript array of state-specific commercial real estate law data. This powers state landing pages for SEO.

Output the data in this exact TypeScript format:

```typescript
export interface StateLandlordTenantData {
  state: string
  stateCode: string         // 2-letter code
  slug: string              // lowercase state name with hyphens
  overview: string          // 2-3 paragraph overview of the state's commercial lease landscape
  keyStatutes: {
    name: string            // statute name/code
    description: string     // what it covers
    url?: string            // link to official state code if available
  }[]
  keyFacts: {
    label: string
    value: string
  }[]
  noticePeriods: {
    type: string            // e.g., "Lease Termination", "Rent Default"
    period: string          // e.g., "30 days", "10 business days"
    details: string
  }[]
  auditRights: {
    summary: string         // brief overview of CAM audit rights in this state
    details: string         // paragraph with specifics
  }
  faqs: {
    question: string
    answer: string
  }[]                       // 4-6 FAQs per state, for FAQ schema
  metaDescription: string   // 150-160 chars for SEO
}

export const stateData: StateLandlordTenantData[] = [
  // ... states here
]
```

**States to include (all 10):**

1. **California** — large market, tenant-friendly, extensive statutory framework
2. **Texas** — landlord-friendly, minimal statutory intervention
3. **New York** — complex regulatory environment, unique NYC rules
4. **Florida** — landlord-friendly, growing commercial market
5. **Illinois** — Chicago-centric, specific municipal requirements
6. **Pennsylvania** — moderate regulation, Philadelphia/Pittsburgh markets
7. **Ohio** — business-friendly, straightforward statutory framework
8. **Georgia** — landlord-friendly, Atlanta hub
9. **New Jersey** — tenant-protective, dense commercial market
10. **Virginia** — business-friendly, Northern Virginia/DC corridor

**Per state, include:**
- `overview`: Commercial lease landscape, general legal climate, key market characteristics
- `keyStatutes`: 3-5 statutes or code sections relevant to commercial leasing (NOT residential)
- `keyFacts`: 5-7 quick facts (e.g., "Security Deposit Limit: No statutory limit for commercial", "Lease Recording: Required for leases > 7 years")
- `noticePeriods`: 3-5 notice period requirements for common actions
- `auditRights`: State-level context on CAM audit rights (many states don't have specific statutory provisions — note this and explain that audit rights are typically negotiated in the lease)
- `faqs`: 4-6 questions a CRE professional would ask about leasing in this state
- `metaDescription`: SEO-optimized description for the state page

**Important accuracy notes:**
- Focus on COMMERCIAL lease law, NOT residential
- Many states have minimal commercial lease statutes (commercial leasing is heavily contract-driven) — say so explicitly rather than inventing protections that don't exist
- Cite specific statute numbers where they exist (e.g., "Cal. Civ. Code Section 1950.7")
- If a state has no specific commercial statute for a topic, say "governed by lease terms" or "common law applies"
- Include any unique local requirements (e.g., NYC commercial rent tax, Chicago lease registration)
