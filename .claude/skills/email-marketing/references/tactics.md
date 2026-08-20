# Email Marketing Tactics -- Lextract Reference

## The 2026 Machine-to-Machine Paradigm

In 2026, AI assistants (Gmail AI, Outlook Copilot) act as gatekeepers before humans see emails. They sort, summarize, and suppress content. Emails must be:
- **Human-sounding**: conversational, non-corporate, specific
- **Hyper-relevant**: references something specific to the recipient (company, role, recent event)
- **Deliverability-optimized**: technical infrastructure must be clean before copy matters

## AI Personalization Tiers

| Tier | Personalization Level | Implementation |
|---|---|---|
| **Basic** | First name, company | `{{first_name}}` tokens. Table stakes in 2026. |
| **Contextual** | Job title + industry + known pain | "As a lease administrator managing a 200-lease portfolio..." |
| **Behavioral** | Actions taken (extracted but didn't buy full report) | "You uploaded a lease and we found 3 red flags. Here's why they matter." |
| **Predictive** | AI-inferred intent signals | Triggered by time-since-upload, portfolio size, extraction volume patterns |
| **Hyper-personal** | Individual-level data + AI drafting | "I noticed your firm just closed a 12-property acquisition in [market]..." |

For cold outreach, contextual tier minimum. For nurture, behavioral and predictive are table stakes.

## Subject Line A/B Testing

**Champion/Challenger framework:**
- Champion: best-performing current subject line (baseline)
- Challenger: one variable changed (curiosity vs. direct benefit, personalized vs. generic)
- Test one variable at a time
- Minimum 200 opens per variant for statistical significance
- Metrics: open rate (primary), click rate (secondary), reply rate (for cold)

**Subject line formula library for Lextract:**

*Loss aversion:*
- "A missed lease renewal cost this tenant $340K"
- "8-15% error rate on manual abstraction. Your portfolio is exposed."

*Curiosity gap:*
- "The 15 lease fields that get missed in every manual review"
- "What your lease says about NNN reconciliation (and what it actually means)"

*Social proof:*
- "How [law firm / PE fund] extracted 200 leases in 2 days"
- "What AI lease abstraction found in a 47-property portfolio last quarter"

*Direct benefit:*
- "126 structured fields from any lease PDF. $20. Under 5 minutes."
- "Abstract your next lease without a paralegal or a spreadsheet"

*Question/engagement:*
- "Quick question about your lease abstraction workflow"
- "How many hours does your team spend per lease?"

## Deliverability Infrastructure

Deliverability must be solved before copy. Even great emails don't convert if they land in spam.

**Technical checklist:**
- [ ] SPF record configured
- [ ] DKIM signature enabled
- [ ] DMARC policy set (p=quarantine minimum)
- [ ] Custom sending domain (not shared IP pool)
- [ ] List hygiene: remove bounces weekly, suppress unengaged 90+ days
- [ ] Warm new sending domains: ramp from 20 to 500 emails/day over 4 weeks
- [ ] Engagement-based sending: prioritize openers for first sends

**Spam trigger words to avoid:** free, guarantee, 100%, urgent, act now, limited time, no obligation, winner, cash, credit card required

**Plain text vs. HTML:**
- Cold outreach: plain text wins (higher deliverability, feels human)
- Transactional / product emails: minimal HTML acceptable (Lextract brand color, one image max)
- Never use image-heavy HTML for cold sequences

## Send-Time Optimization

**General benchmarks:**
- Highest open rates: Tuesday-Thursday, 9-11am recipient local time
- Avoid: Friday afternoons, Mondays before 10am, Saturday/Sunday
- Re-engagement campaigns: Saturday 10am sometimes outperforms (less competition)

**AI-driven send-time optimization:** Most modern ESPs (Klaviyo, ActiveCampaign, HubSpot) offer "send time optimization" that delivers each email when each individual contact is most likely to open, based on historical behavior. Enable this for nurture sequences.

## AI-Powered Sequence Automation

**Behavioral triggers (set up in ESP):**
- `extraction_completed` -> trigger teaser-to-paid nurture sequence
- `report_viewed_but_not_purchased` (3+ views) -> trigger urgency sequence
- `credits_purchased` -> trigger onboarding + upsell sequence
- `red_flags_detected` -> trigger CamAudit cross-sell sequence
- `inactive_30_days` -> trigger re-engagement sequence
- `portfolio_upload` (10+ leases) -> trigger enterprise/volume pricing outreach

**Suppression rules:**
- Stop nurture sequence if purchase event fires
- Stop cold sequence if reply received (route to CRM)
- Stop re-engagement if unsubscribe or hard bounce

## Compliance (CAN-SPAM + GDPR)

**CAN-SPAM (US):**
- Physical mailing address in every email footer (required)
- Clear identification as advertising where applicable
- One-click unsubscribe (must be honored within 10 business days)
- No deceptive subject lines or headers

**GDPR (EU/UK):**
- Explicit opt-in consent required, cannot cold-email without prior consent or legitimate interest basis
- Right to erasure: honor unsubscribe + delete from all lists within 30 days
- Data processing agreements with ESPs
- If cold emailing EU contacts: document the "legitimate interest" basis

**Practical rule:** For cold outreach, US audiences -> CAN-SPAM compliant. EU audiences -> require opt-in, use LinkedIn or gated content lead generation instead.

## Advanced Sequence Types

### Webinar Follow-Up (3 emails)
1. Day 0: "You're registered, here's what to expect" (confirm + anticipation)
2. Day of: "We're live in 2 hours" (last-chance reminder)
3. Day +1: "Replay is available" (capture non-attendees)

### Post-Demo / Post-Trial Nurture (7 emails)
1. Day 1: What you saw, why it matters (key moment recap: the 126 fields, the red flags, the confidence scores)
2. Day 3: Social proof (firm similar to theirs)
3. Day 5: Objection handling (cost vs. manual abstraction, data security, accuracy)
4. Day 7: Case study email (specific numbers: "47 leases, 12 red flags, 2 days")
5. Day 10: FOMO / urgency (portfolio deadline, deal closing timeline, competitor adoption)
6. Day 14: "Still thinking it over?" (direct, short)
7. Day 21: Break-up email ("Closing the loop on your trial")

### Re-Engagement (3 emails)
1. "We haven't seen you in a while" + reminder of their last extraction results
2. "New capability" (announce a new field type, red flag rule, or export format)
3. "Last chance" + list-clean warning (honest: "We'll remove you from our list in 5 days")

## Lextract-Specific Email Timing

| Month | Event | Campaign |
|---|---|---|
| January | Q1 portfolio reviews begin | "Start the year with clean lease data" campaign |
| March-April | Lease renewal season ramps up | "Before you renew, know what's in the existing lease" sequences |
| June-July | Mid-year portfolio audits | "Half your leases haven't been abstracted. Here's why that's a risk." |
| September-October | Q4 budget planning, acquisition season | "PE due diligence season: extract 100 leases before the LOI expires" |
| November-December | Year-end compliance, ASC 842 deadlines | "Your lease data isn't audit-ready. Fix it before year-end." |
