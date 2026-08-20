# Marketing Copy Audit — Ground Truth Fact Sheet

Source of truth: `frontend/data/public-knowledge/marketing.ts` + `CLAUDE.md`.
Use ONLY these as verified facts. Anything asserted on a page that is NOT here is unverified
and must be softened (hedged), sourced, or removed.

## Verified TRUE (safe to assert)
- Product: AI commercial lease abstraction. PDF in, structured fields out.
- **126 fields**, **20 red flag rules** (3 severity levels), **16 categories**.
- Pricing: **$15** single · **$65** 5-pack (13% off, $13/lease) · **$120** 10-pack (20% off, $12/lease).
- **Credits never expire. No subscription.** 30-day money-back guarantee.
- Processing: **5-15 minutes** (vs 4-8 hours manual). Email when ready.
- Exports: JSON, Excel, Word, PDF.
- Pipeline: Vision AI (Gemini, native PDF, reads scanned + digital), 3-pass adversarial
  validation, per-field confidence (High/Med/Low blended doc+AI confidence).
- Security: TLS 1.3 in transit, AES-256 at rest, private Cloudflare R2, pre-signed URLs,
  no data sold/shared with third parties.
- Supported leases: single/multi-tenant, NNN, gross, modified gross, full service gross,
  ground, percentage. Up to 200 pages.
- Outsourced/manual abstraction market reference: **$90-$250 per lease** (this is the only
  competitor price figure in the knowledge base — `competitorRange`).
- Named competitors (neutral framing only): LeaseLens, Prophia, Re-Leased Credia AI,
  outsourced abstraction services.

## NOT verified — must soften / source / remove (NO-LIE violations)
- Any specific offshore price ("$50-$100", "1-5 business days") — not in KB.
- Specific enterprise competitor pricing ("$10,000-$100,000+/year", Prophia/MRI dollar figures).
- "40-80 fields for manual" or any invented competitor field counts.
- Absolute disparagement: "ChatGPT cannot process scanned PDFs", "No other tool does X",
  "the only tool that..." — soften to factual, defensible phrasing.
- Any accuracy percentage ("99% accurate" etc.) — never assert a number; we only claim
  confidence scoring + recommend human review.
- Fake social proof: testimonials, named customers, customer counts ("trusted by 500+"),
  star ratings, award badges, logos. None exist — remove any found.
- Any guarantee/SLA/uptime number not listed above.

## Disclaimers that must remain intact
- Output is informational only, not legal/tax/accounting advice.
- Users must verify extracted data against the original lease.
- Confidence scores indicate review priority, not a guarantee of accuracy.

## The six passes (apply to every page in scope)
1. **Humanizer** — remove AI tells (rule-of-three, inflated symbolism, "—", promotional
   filler, negative parallelism, vague attributions, "-ing" analyses). Per humanizer skill.
2. **Third-grade readability** — short sentences, plain words, concrete nouns. A non-expert
   should understand every sentence. Keep domain terms but explain or simplify around them.
3. **Source verification** — every factual/numeric claim must trace to the list above.
4. **No-lie** — no invented stats, fake proof, or indefensible absolutes.
5. **Zero em-dashes** — no `—` characters anywhere (en-dash `–` for numeric ranges is OK;
   prefer "to" in prose). Replace em-dashes with period, comma, or "to".
6. Preserve all JSX/props/links/schema and pricing variables; never hardcode a price that
   should come from `formatPrice`/`PRICING`. Do not break the build.
