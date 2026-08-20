# US-032: Email Notifications

**Phase:** 4 — Results & Payment | **Depends on:** US-015a | **Blocks:** None
**Type:** Backend
**Estimated session size:** Small

## Description

Integrate Resend SDK for transactional email and implement two notification templates: "extraction complete" with a link to results, and "CAM flags found" with CamAudit pitch for extractions that trigger the CamAudit funnel.

## Required Skills

- `superpowers:test-driven-development`
- `humanizer` — email copy must be professional and natural

## Acceptance Criteria

- [ ] Resend SDK integrated with `RESEND_API_KEY` env var
- [ ] "Extraction complete" email: sent when pipeline finishes successfully
- [ ] Email includes: document name, field count, confidence summary, link to results page
- [ ] "CAM flags found" follow-up email: sent when `should_show_camaudit` returns true
- [ ] CAM email includes: flag count, flag names, CamAudit pitch with 20% discount mention
- [ ] HTML + plain text templates for both emails
- [ ] Only sent to authenticated users with verified email (not anonymous sessions)
- [ ] Email sending is async (Celery task) — does not block pipeline
- [ ] Tests with mocked Resend API
- [ ] Email copy is professional and natural, not salesy or AI-generated

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/email.py` (EmailService class with Resend)
- Create: `backend/app/services/email_templates/` (HTML templates)
- Create: `backend/app/tasks/email.py` (send_email Celery tasks)
- Modify: `backend/app/tasks/pipeline.py` (trigger email on completion)
- Test: `backend/tests/test_email.py`

### Key Implementation Notes

- Use `resend` Python SDK: `resend.Emails.send(from, to, subject, html, text)`
- From address: `angel.campa@lextract.io`
- Trigger: at end of pipeline (after `mark_complete`), dispatch email task
- CAM email: only sent if `should_show_camaudit(red_flags, extracted_data, confidence_scores)` returns true
- Delay CAM email by 30 minutes after completion email (don't overwhelm)
- Templates should be clean, professional — Lextract branding, clear CTA buttons
- Skip email for anonymous sessions (no verified email address)

### Integration Points

- US-015a (Pipeline) triggers email at completion
- US-009 (Red Flags) provides `should_show_camaudit` for CAM email decision
- US-026 (CamAudit Handoff) provides the CamAudit link for email CTA

## Verification

```bash
cd backend
pytest tests/test_email.py -v  # Email tests pass with mocked Resend
# Verify: pipeline completion triggers extraction-complete email
# Verify: CAM email only sent when should_show_camaudit is true
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Email" section: Resend integration
- `docs/PRD.md` — Section 10.3: Email notification requirements
