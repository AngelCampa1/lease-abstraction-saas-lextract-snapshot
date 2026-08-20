---
name: email-marketing
description: Draft email campaigns, sequences, and individual emails for Lextract marketing. Use this whenever you need to write a cold outreach email, nurture sequence, onboarding flow, re-engagement campaign, product announcement, or follow-up email for Lextract leads, trial users, or paying customers. Also useful for subject line optimization, A/B test variants, segmentation strategy, and compliance review.
---

# Email Marketing for Lextract

You are drafting email content informed by AI-driven email marketing best practices for 2026. Lextract's email strategy spans cold outreach (RE attorneys, asset managers, PE acquisition teams, lease administrators, property managers), free-extraction-to-paid nurture, post-extraction upsell, and re-engagement.

## Step 1: Identify the email type

| Type | Trigger | Goal |
|---|---|---|
| **Cold outreach** | Prospect hasn't heard of Lextract | First touch, earn a reply or site visit |
| **Lead nurture** | Signed up but hasn't uploaded a lease | Move to first extraction |
| **Teaser view to paid** | Ran extraction, saw partial results (blurred fields) | Convert at the paywall |
| **Post-purchase onboarding** | Just bought credits | Ensure success, reduce churn |
| **Upsell / credit pack** | Used 1 extraction | Sell credit pack (5, 10, or 25 extractions) |
| **Re-engagement** | Inactive 30-90 days | Reactivate or clean list |
| **Referral ask** | Happy customer | Drive referral or partner channel |
| **Partner / white-label** | Law firm / PM firm / brokerage | B2B channel development |

Ask the user which type, or infer from their request.

## Step 2: Define the audience segment

Lextract audiences need different messaging:

- **RE attorney**: risk-mitigation framing, due diligence speed, missed clause liability, malpractice avoidance
- **Asset manager / PE acquisition team**: portfolio-scale efficiency, deal velocity, 126-field standardization across hundreds of leases, underwriting accuracy
- **Property manager**: operational pain, manual abstraction hours, renewal/expiration tracking, NNN reconciliation errors
- **Lease administrator**: 4-8 hours per lease manual abstraction, critical date tracking, audit trail requirements, ASC 842 compliance
- **Tenant rep / commercial broker**: client service speed, competitive differentiation, deal closing velocity
- **Corporate RE team**: portfolio-level consistency, headcount reduction, standardized output across markets
- **Lender / investor**: due diligence package speed, risk flagging, confidence scoring for underwriting decisions
- **High-intent user**: already in pain from a missed renewal or buried clause, needs immediate path to structured data

## Step 3: Write the email

### Subject line
- Mobile preview: <=50 characters (41 characters optimal)
- Personalization token increases open rate (+26% average)
- Best-performing subject line types:
  - Curiosity gap: "The 15 lease terms most often missed in manual review"
  - Direct benefit: "126 fields extracted in 5-15 minutes for $15"
  - Loss aversion: "A missed renewal option cost this tenant $340K"
  - Question: "How long does your team spend abstracting a single lease?"
  - Ultra-low friction: "Quick question about your lease review process"

**Avoid:** spam trigger words (free, guarantee, 100%), all-caps subject lines, misleading RE: prefixes

### Email body
- **Opening**: never start with "I", "My name is", or company name in the first sentence
- Lead with the recipient's problem, not your product
- **Length by type**: Cold = 150-200 words. Nurture = 200-350 words. Educational = up to 500 words.
- One topic per email. One CTA per email.
- Plain text outperforms HTML for cold outreach (higher deliverability)
- HTML with minimal design for product/transactional emails

### CTA
- One action only, don't give three choices
- Low-friction: "See your extraction results" / "Upload your first lease" / "View the 126-field report"
- Create urgency where legitimate: "Your teaser results expire in 48 hours" / "Q4 portfolio review deadline is approaching"

## Step 4: Sequences

For multi-email sequences, deliver each email labeled with:
- Email # and subject line
- Timing: "Send Day 1" / "Send Day 3 if no open" / etc.
- Goal of that specific email

### Teaser-to-paid nurture (example structure)
- Day 0 (immediate): Extraction complete, "Your lease results are ready" (blur hook, field count visible, confidence scores teased, CTA to unlock full report)
- Day 1: Educational email, "Here's what the confidence scoring means for your review workflow"
- Day 3: Social proof, "[Firm type] extracted 47 leases in one afternoon using the same tool"
- Day 7: Red flag highlight, "We flagged 3 red flags in your lease. Here's why they matter."
- Day 14: Re-engagement / last chance

### Cold outreach sequence (5-touch)
- Email 1: Ultra-short (<150 words), problem-focused, no pitch
- Email 2 (+3 days): Value drop, useful insight they didn't ask for (e.g., "The 5 NNN clauses most often missed in manual abstraction")
- Email 3 (+5 days): Case study or specific finding ("A PE firm extracted 200 leases during due diligence in 2 days instead of 3 weeks")
- Email 4 (+7 days): Direct ask, simple question, not a demo request
- Email 5 (+10 days): Break-up email ("Closing the loop")

## Step 5: Compliance check

Before finalizing any cold email, confirm:
- Physical mailing address in footer (CAN-SPAM)
- One-click unsubscribe link
- No deceptive subject lines
- For EU recipients: explicit consent/opt-in required (GDPR)
- No purchased lists for GDPR targets, only opted-in contacts

## Output format

- **Single email**: Subject line (2-3 variants) + body text, ready to paste
- **Sequence**: All emails labeled with timing, subject lines, and goal
- **A/B test**: Two subject line variants with rationale for which to test as champion/challenger

## Lextract Email Angles That Convert

- Loss-aversion around missed critical dates: "A missed renewal option cost this tenant $340K. The clause was on page 47."
- The specific field count and speed: "126 structured fields from a 200-page lease in under 4 minutes"
- Peer validation: "A [law firm / PE fund / asset manager] extracted [X] leases and caught [Y] red flags"
- Fear of manual error: "8-15% human error rate on manual abstraction. Confidence scoring catches what reviewers miss."
- Cost comparison: "$15/lease vs. $150-$300 for professional services. Same 126 fields."
- CamAudit cross-sell: "We flagged NNN reconciliation issues in your lease. Want to run a full CAM audit?"

## Copy Rules (Mandatory)

- **Run the humanizer skill on all output.** After drafting any content, invoke the `humanizer` skill to remove AI writing patterns before delivering the final version.
- **Em dashes are strictly prohibited.** Never use em dashes in any output. Use commas, colons, parentheses, or restructure the sentence instead.

## References

For AI personalization architecture, deliverability infrastructure, send-time optimization, AI inbox filtering strategy, and advanced sequence types, read `references/tactics.md`.
