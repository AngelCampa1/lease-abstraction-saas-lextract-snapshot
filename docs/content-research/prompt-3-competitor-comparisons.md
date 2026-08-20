# Deep Research Prompt: Competitor Comparisons

> **Usage:** Copy this entire prompt into ChatGPT Deep Research. The output will be TypeScript data structures ready to paste into `frontend/data/comparisons.ts`.

---

## Prompt

You are a content strategist for **Lextract.io**, an AI-powered commercial lease abstraction platform. Lextract takes a commercial lease PDF, runs it through a 3-pass adversarial AI extraction pipeline (Google Gemini 3 Flash via OpenRouter, native PDF multimodal input — no separate OCR step), and returns 126 structured data fields with confidence scores and red flag detection. Key facts:

- **Price:** $15 per lease (single), $65 for 5-pack (13% off), $120 for 10-pack (20% off)
- **Speed:** ~30 seconds to 2 minutes per lease (depends on length)
- **Output:** 126 structured fields, confidence scores per field, red flag detection, Word/PDF/Excel export
- **Technology:** Google Gemini 3 Flash via OpenRouter, native PDF multimodal input, 3-pass adversarial validation (Pass 1 primary extraction, Pass 2 hostile-reviewer validation re-reading the PDF, Pass 3 escalation on disputed critical fields). Storage: Cloudflare R2 (S3-compatible, zero egress).
- **Marketing copy rule:** when generating user-facing comparison copy, refer to the system as "AI" or "AI-powered" — do not name the underlying model.
- **Security:** No lease data retained after processing, encrypted in transit and at rest during processing
- **Target user:** CRE professionals who need lease abstracts (tenant reps, brokers, property managers, attorneys)
- **Sister product:** CamAudit.io for CAM reconciliation audits

---

### Deliverable: Competitor Comparison Data (2 comparisons)

Create a TypeScript data structure for competitor comparison pages. Research each competitor thoroughly and provide factual, balanced comparisons.

Output the data in this exact TypeScript format:

```typescript
export interface ComparisonFeature {
  feature: string
  lextract: string
  competitor: string
  advantage: 'lextract' | 'competitor' | 'tie'
}

export interface ComparisonData {
  competitor: string
  competitorSlug: string
  competitorUrl?: string
  competitorDescription: string   // 1-2 sentences about what they do
  metaTitle: string               // "Lextract vs {Competitor}: ..."
  metaDescription: string         // 150-160 chars
  introduction: string            // 2-3 paragraphs setting up the comparison
  features: ComparisonFeature[]   // 8-12 feature comparisons
  pricing: {
    lextract: string              // pricing summary
    competitor: string            // pricing summary
    analysis: string              // 1-2 paragraphs comparing value
  }
  strengths: {
    lextract: string[]            // 4-6 bullet points
    competitor: string[]          // 3-5 bullet points (be fair)
  }
  weaknesses: {
    lextract: string[]            // 2-3 bullet points (be honest)
    competitor: string[]          // 3-5 bullet points
  }
  bestFor: {
    lextract: string              // "Best for..." summary
    competitor: string            // "Best for..." summary
  }
  verdict: string                 // 2-3 paragraph balanced conclusion
}

export const comparisons: ComparisonData[] = [
  // ... comparisons here
]
```

---

### Comparison 1: Lextract vs LeaseLens

**Research LeaseLens thoroughly.** LeaseLens is an AI-powered lease abstraction tool. Find their:
- Current pricing model
- Feature set (how many fields, what output formats)
- Technology approach
- Target market
- Any published reviews or user feedback

**Feature comparison axes (include all):**
1. Number of fields extracted
2. Processing speed
3. Price per lease
4. Confidence scoring
5. Red flag detection
6. Export formats (Word, PDF, Excel)
7. OCR quality / document handling
8. Batch processing
9. Data security / retention policy
10. CamAudit / audit integration

**Writing guidelines:**
- Be factual and fair — acknowledge where LeaseLens is strong
- If you can't find specific data about LeaseLens, say "not publicly disclosed" rather than guessing
- Position Lextract's 126-field extraction and $15 price point as differentiators
- The comparison should help a buyer make an informed decision, not just sell Lextract

---

### Comparison 2: Lextract vs Outsourced / Manual Abstraction Services

This compares Lextract against the traditional approach: hiring paralegals, outsourced abstraction firms, or doing it in-house manually.

**Research the manual abstraction market:**
- Typical cost range for outsourced lease abstraction
- Average time per lease for manual abstraction
- Common providers (CBRE, JLL, Cushman & Wakefield offer this; also boutique firms)
- Accuracy and quality considerations
- Turnaround time

**Use `competitor: "Outsourced Services"` and `competitorSlug: "outsourced-services"`**

**Feature comparison axes (include all):**
1. Cost per lease
2. Processing time
3. Number of fields extracted
4. Consistency across leases
5. Scalability (10 leases vs 1,000)
6. Turnaround time
7. Confidentiality / data handling
8. Customization of output
9. Human review / judgment calls
10. Integration with existing workflows

**Writing guidelines:**
- Be genuinely balanced — manual abstraction has real advantages (human judgment, context understanding, handling unusual lease structures)
- Acknowledge that complex leases with unusual structures may still benefit from human review
- Position Lextract as the first pass / triage tool, with human review for edge cases
- Include typical cost ranges: $150-$400 per lease for outsourced services, 4-8 hours per lease for in-house
- Note that many firms use a hybrid approach (AI first pass + human QA)

---

### General Requirements

- All text should be written in a balanced, journalistic tone — not a sales pitch
- Include specific numbers wherever possible (pricing, field counts, time estimates)
- If information about a competitor is not publicly available, explicitly note this
- The `verdict` section should genuinely help the reader decide, not just push Lextract
- Strengths and weaknesses for Lextract must include honest limitations (e.g., no human review layer, requires clean PDF input, new product without track record)
