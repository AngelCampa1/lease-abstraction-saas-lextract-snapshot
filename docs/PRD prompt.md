I'm building this as a standalone product derived from the research i've been doing for camaudit-v2. I want to use the same tech stack as <camaudit-v2-repo>.

**Lextract.io — Feature List for PRD**

**Core Pipeline**
- PDF upload (single lease document)
- Google Gemini 3 Flash via OpenRouter — native PDF multimodal input, no separate OCR step
- 3-pass adversarial validation (Pass 1 primary extraction, Pass 2 hostile-reviewer validation re-reading the PDF, Pass 3 escalation on disputed critical fields)
- Extraction against 126-field schema (docs\lextract_field_schema.json)
- Confidence score per field (high/medium/low) merged from Gemini self-reported scores + Pass 2/3 outcomes
- Structured JSON output

**Extraction UI**
- Upload page with drag-and-drop
- Processing status indicator
- Results view organized by category (16 categories)
- Editable fields post-extraction
- Red flag alerts (rule-based, e.g. management fee cap >15%, missing audit rights, no CAM cap)

**Export**
- Word report
- PDF report
- Excel export
- Preset templates (Commercial, Office, Industrial, Retail)

**Payments**
- Stripe pay-per-use at $15/lease extraction
- Pay before results are shown fully, have a teaser blurred with just 1 item extracted
- Credit system (buy 5 leases, buy 10 leases)

**CamAudit Funnel**
- Post-extraction CTA if CAM-relevant fields detected
- One-click JSON handoff to CamAudit (pre-populate lease data)
- Contextual upsell messaging based on red flags found

**Auth & Storage**
- Supabase
- Extraction history per user
- Re-download past extractions

**Landing Page**
- Headline, demo/sample output
- Pricing ($15/lease)
- Comparison vs LeaseAbstractAI
- CamAudit cross-link

Please create a PRD based on all the info you gather, ask me as many questions you have