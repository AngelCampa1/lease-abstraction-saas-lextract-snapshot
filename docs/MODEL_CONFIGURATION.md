# Model Configuration

Lextract uses a multi-pass adversarial extraction pipeline powered by frontier models via [OpenRouter](https://openrouter.ai). All models read the PDF natively via multimodal vision — there is no separate OCR step. Model slugs are configured in `backend/app/core/config.py` and overridable via environment variables.

## Pipeline Overview

### Default 3-Pass Pipeline

```
Pass 1: Full Extraction ──> Pass 2: Adversarial Validation ──> Pass 3: Escalation (conditional)
   (all fields, PDF input)    (sparse corrections patch)        (resolve disputed critical fields)
   Always runs                Always runs                       Only if Pass 2 corrected critical
                                                                fields or confidence < 0.80
```

### Dual-Extract + Judge Pipeline (feature-flagged, `EXTRACTION_DUAL_ENABLED=true`)

```
Pass 1 (Gemini) ─┐
                 ├──> Judge (GLM-5.1, JSON only) ──> Pass 3 (Gemini, PDF escalation)
Sibling (GPT-5) ─┘                                   on critical-field synthesis verdicts
```

Vendor distribution: **Google** (Pass 1) → **OpenAI** (Sibling) → **Zhipu** (Judge). Three independent reads and three independent vendors — the judge cannot be biased toward either extraction side's underlying training.

Pass 3 fires in dual mode on: any judge `synthesis` verdict on a critical field, any critical-field verdict with confidence < 0.80, or any critical field where A and B disagreed but the judge dropped the verdict.

## Model Chain

> **Key constraint**: Pass 1, 2, 3, and Sibling read the **PDF directly** (multimodal vision). They must use **PDF-capable models only**. The Judge sees **JSON + schema only** — it can use text-only models.

### Pass 1 — Full Extraction

Extracts all fields directly from the PDF (native multimodal input, no OCR) into structured JSON with confidence scores and source citations. Gemini 3 Flash's 1M token context handles any commercial lease end-to-end.

| Role | Model | Slug | In $/M | Out $/M | Context | Notes |
|------|-------|------|--------|---------|---------|-------|
| Primary | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | Strongest PDF model in chain |
| Fallback 1 | Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite-preview` | $0.25 | $1.50 | 1M | Half the cost, same 1M context |
| Fallback 2 | GPT-5.4 Mini | `openai/gpt-5.4-mini` | $0.75 | $4.50 | 400K | Vendor diversity last resort |

### Pass 2 — Adversarial Validation

Acts as a "hostile reviewer" — re-reads the PDF (multimodal, same as Pass 1) with the Pass 1 JSON in hand and a 10-point forensic checklist. Outputs a sparse corrections patch (only wrong fields). Pass 2 always runs; the cheap Lite model is the primary to minimize per-lease cost.

| Role | Model | Slug | In $/M | Out $/M | Context | Notes |
|------|-------|------|--------|---------|---------|-------|
| Primary | Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite-preview` | $0.25 | $1.50 | 1M | Cheap primary — Pass 2 always runs |
| Fallback 1 | GPT-5.4 Mini | `openai/gpt-5.4-mini` | $0.75 | $4.50 | 400K | Different vendor for adversarial review |
| Fallback 2 | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | Last-resort fallback |

### Pass 3 — Escalation (conditional)

Resolves disputes between Pass 1 and Pass 2 on critical fields only (rent, dates, sq ft, options, etc.). Receives both values plus per-field domain knowledge. Only runs when needed.

| Role | Model | Slug | In $/M | Out $/M | Context | Notes |
|------|-------|------|--------|---------|---------|-------|
| Primary | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | Strongest for tough disputes |
| Fallback 1 | Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite-preview` | $0.25 | $1.50 | 1M | Cost-effective fallback |
| Fallback 2 | GPT-5.4 Mini | `openai/gpt-5.4-mini` | $0.75 | $4.50 | 400K | Last resort |

### Sibling Extraction — Dual Mode Only

A second independent full extraction run in parallel with Pass 1, using a **different vendor** (OpenAI vs. Google) so the judge gets two genuinely independent reads.

| Role | Model | Slug | In $/M | Out $/M | Context | Notes |
|------|-------|------|--------|---------|---------|-------|
| Primary | GPT-5.4 Mini | `openai/gpt-5.4-mini` | $0.75 | $4.50 | 400K | Different vendor from Pass 1's Google |
| Fallback 1 | Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite-preview` | $0.25 | $1.50 | 1M | Cost-effective fallback |
| Fallback 2 | Gemini 3 Flash | `google/gemini-3-flash-preview` | $0.50 | $3.00 | 1M | Last resort |

### Judge — Dual Mode Only

Per-field arbiter. Receives Pass 1 JSON + Sibling JSON + a Python-computed diff of disagreeing fields + the JSON Schema. **Does NOT see the PDF** — text-only context only. Picks `a`, `b`, or synthesizes a corrected value for each disagreement. Fail-open: any error → empty verdicts → merger falls back to Pass 1.

| Role | Model | Slug | In $/M | Out $/M | Context | Notes |
|------|-------|------|--------|---------|---------|-------|
| Primary | GLM-5.1 | `z-ai/glm-5.1` | $1.05 | $3.50 | 200K | Highest reasoning, Zhipu vendor |
| Fallback 1 | MiniMax M2.7 | `minimax/minimax-m2.7` | $0.30 | $1.20 | 196K | Cheap text reasoning, MiniMax vendor |
| Fallback 2 | Kimi K2.6 | `moonshotai/kimi-k2.6` | $0.74 | $4.66 | 262K | Moonshot vendor, last resort |

> **Note**: MiniMax M2.7, GLM-5.1, and Kimi K2.6 are **text-only** models (verified via OpenRouter `architecture.input_modalities`). They appear only in the Judge chain where the judge by design never sees the PDF.

## Why These Models

### Gemini 3 Flash (Pass 1 primary / Pass 3 primary)
- Strongest PDF multimodal model in the chain — reads scanned PDFs, native PDFs, and image-only PDFs uniformly
- 1M token context handles any commercial lease end-to-end
- Fast response times from Google-native infrastructure

### Gemini 3.1 Flash Lite (Pass 2 primary / universal fallback)
- Half the price of Gemini 3 Flash with the same 1M context window
- Promoted to Pass 2 primary and universal fallback 1 to minimize cost on the always-runs validation step
- PDF-capable — qualifies for any pass that reads the document

### GPT-5.4 Mini (Pass 1 fallback 2 / Pass 2 fallback 1 / Sibling primary)
- Multimodal — qualifies for PDF-reading passes
- Provides vendor diversity: when Google models fail, OpenAI provides a genuinely independent read
- Sibling primary: deliberately chosen as a different vendor from Pass 1's Google so the judge sees two independent reads

### GLM-5.1 (Judge primary)
- Highest reasoning index of the text-only models — best for schema-grounded per-field arbitration
- Zhipu AI is a third vendor beyond Google and OpenAI — the judge cannot be biased toward either extraction side
- Text-only: qualified for the Judge role (JSON + schema, no PDF)

### MiniMax M2.7 (Judge fallback 1) / Kimi K2.6 (Judge fallback 2)
- Text-only models — qualified for Judge role only
- Provide vendor diversity in the judge fallback chain (MiniMax, Moonshot)

## Cost Per Lease

Assuming ~4K input tokens, ~4K output tokens per pass for a typical 10-page lease:

| Scenario | Estimated Cost | Notes |
|----------|---------------|-------|
| Pass 1 + Pass 2 (standard) | ~$0.005 | Lite primary for P2 |
| Pass 1 + Pass 2 + Pass 3 | ~$0.006 | Disputed critical fields |
| Dual-extract (Pass 1 + Sibling + Judge) | ~$0.012 | With GLM-5.1 judge |
| Dual + Pass 3 escalation | ~$0.014 | Full pipeline |
| Cost ceiling | $0.50 | Hard limit per extraction |

> Cost ceiling is $0.50/extraction (configurable via `MAX_EXTRACTION_LLM_COST_USD`). If hit, remaining passes are skipped and the partial result is returned. Lextract charges $15/lease.

All pricing as of April 2026 via OpenRouter.

## Configuration

All model slugs and feature flags in `backend/app/core/config.py`:

```bash
# Pass 1 — Full extraction (PDF input, multimodal required)
PASS1_MODEL=google/gemini-3-flash-preview
PASS1_FALLBACK_MODEL=google/gemini-3.1-flash-lite-preview
PASS1_FALLBACK_MODEL_2=openai/gpt-5.4-mini

# Pass 2 — Adversarial validation (PDF input, multimodal required)
PASS2_MODEL=google/gemini-3.1-flash-lite-preview
PASS2_FALLBACK_MODEL=openai/gpt-5.4-mini
PASS2_FALLBACK_MODEL_2=google/gemini-3-flash-preview

# Pass 3 — Escalation (PDF input, multimodal required)
PASS3_MODEL=google/gemini-3-flash-preview
PASS3_FALLBACK_MODEL=google/gemini-3.1-flash-lite-preview
PASS3_FALLBACK_MODEL_2=openai/gpt-5.4-mini

# Sibling — Second full extraction for dual mode (PDF input, multimodal required)
EXTRACTION_SIBLING_MODEL=openai/gpt-5.4-mini
EXTRACTION_SIBLING_FALLBACK_MODEL=google/gemini-3.1-flash-lite-preview
EXTRACTION_SIBLING_FALLBACK_MODEL_2=google/gemini-3-flash-preview

# Judge — Per-field arbiter for dual mode (TEXT only — no PDF)
EXTRACTION_JUDGE_MODEL=z-ai/glm-5.1
EXTRACTION_JUDGE_FALLBACK_MODEL=minimax/minimax-m2.7
EXTRACTION_JUDGE_FALLBACK_MODEL_2=moonshotai/kimi-k2.6

# Feature flags
EXTRACTION_DUAL_ENABLED=false        # Enable dual-extract + judge path
RAW_EXTRACTION_DUMP_ENABLED=true     # Dump raw LLM responses to R2 for forensic replay
MAX_EXTRACTION_LLM_COST_USD=0.50     # Per-extraction cost ceiling
```

## Technical Details

- All models accessed via OpenRouter's OpenAI-compatible API (`AsyncOpenAI` client with `base_url=openrouter.ai`)
- PDF sent as native base64 multimodal input — no OCR, no text extraction pre-step
- Fallback chain: tries models in order, first success wins, logs warnings on failures
- Per-stage observability: `extraction_pipeline_events` table records attempt, duration, model, and error class for each stage
- Raw pass responses optionally dumped to `extractions/{id}/raw/{pass_kind}-{model}.json` in R2 for forensic replay
- Cost tracking: `extraction_cost_cents` persisted to `extractions` table using OpenRouter pricing registry
- Stage summary: compact `stage_summary` JSONB column on `extractions` for at-a-glance audit

*Last updated: 2026-04-26*
