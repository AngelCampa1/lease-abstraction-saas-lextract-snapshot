# Portfolio index

This is the write-up layer: retrospective documents aimed at a reader who did not build Lextract and
has a few minutes to decide whether the engineering underneath is real. Every claim in these ten
documents traces to a file, a line, or a command in this repository: nothing here is asserted
without something to check it against. Start at the root [`README.md`](../README.md) for the
narrative version; come here for the reference documents it links out to.

**If you read one thing:** [`ARCHITECTURE.md`](ARCHITECTURE.md): the full services map, data model
and API surface for the system that actually ran in production.

## Documents

| Document | Length | Covers |
| --- | --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 420 lines | Repo layout, the extract-SDK library, external services map, data model, API surface, background jobs, deployment |
| [PRD.md](PRD.md) | 447 lines | Product vision, market context, tech stack, the 126-field extraction schema, the 3-pass pipeline, the 20 red-flag rules, export system, pricing |
| [PRD-APPENDIX.md](PRD-APPENDIX.md) | 358 lines | Continuation of PRD.md: CamAudit funnel, auth and storage schema, full API contract, landing page spec, non-functional requirements, verification plan |
| [USER-FLOWS.md](USER-FLOWS.md) | 137 lines | Five user journeys, step by step, including the anonymous upload path |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 264 lines | The Cloudflare deploy path, as it was actually run, plus the environment-variable reference |
| [DESIGN.md](DESIGN.md) | 288 lines | Color tokens, typography, component patterns, and the mobile-first standards the UI was held to |
| [SECURITY.md](SECURITY.md) | 158 lines | Auth model, tenant isolation, document storage/retention, payment data, fixture-corpus PII, and what is deliberately not a vulnerability |
| [METRICS.md](METRICS.md) | 200 lines | Every code, test, and schema figure in the repository, each paired with the command that reproduces it |
| [TESTING.md](TESTING.md) | 243 lines | The suites and gates, the two honest ways to count test files, and how extraction accuracy is actually measured |
| [ENGINEERING-LOG.md](ENGINEERING-LOG.md) | 282 lines | A dated log of specific bugs and decisions, each cited to the file it came from |
| [screenshots/](screenshots/) | 12 images | The curated capture set referenced from the root README |

PRD.md and PRD-APPENDIX.md are one document split across two files because the combined product
requirements ran past this portfolio's 450-line band; the appendix keeps the original section
numbers (10 to 15) so citations against either half still resolve.

## What `docs/` holds

`docs/` holds the working residue: dated end-to-end bug reports, accessibility and visual audit
runs, implementation plans, content-research prompts, the 44-story build tracker, and the
126-field schema JSON the extraction pipeline actually reads. Two files there are worth a
stranger's time, so they are named here rather than left for a reader to stumble on:
[`docs/Commercial PM SaaS Research & Strategy.md`](../docs/Commercial%20PM%20SaaS%20Research%20%26%20Strategy.md)
is the market research (buyer workflows, pain points, competitive landscape) that
`portfolio/PRD.md` §2 draws its market context from, and
[`docs/CAMAUDIT_REUSE.md`](../docs/CAMAUDIT_REUSE.md) maps, file by file, which parts of Lextract's
backend were already ported to CamAudit-v2 and which still needed it, from the same era the two
products consolidated onto the shared `extract-sdk` package that `portfolio/ARCHITECTURE.md`
§1c describes.
