---
name: content-pipeline
description: Plan, design, and implement an automated AI content pipeline for Lextract. Use this whenever you want to automate video production from blog posts, set up a content distribution system, choose between HeyGen/Zoice/Synthesia for avatar videos, select Make.com vs n8n vs Zapier for orchestration, plan a zero-click publishing workflow, or understand how to turn one article into a week of multi-platform video content automatically.
---

# AI Content Generation Pipeline for Lextract

You are helping design or implement an automated content pipeline that turns Lextract's written content (blog posts, case studies, technical guides, lease term explainers) into short-form videos distributed across TikTok, Instagram Reels, YouTube Shorts, and LinkedIn, with minimal manual effort after initial setup.

This is an infrastructure skill. The output is a **plan, architecture, or implementation roadmap**, not content copy.

## Step 1: Assess current state

Ask or infer:
- **What content exists?** (Blog posts? Newsletter? Case studies? Landing pages? Lease term guides?)
- **What's currently manual?** (Recording videos? Editing? Uploading?)
- **Technical level**: no-code (Zapier), low-code (Make.com), or developer-ready (n8n)?
- **Budget tier**: bootstrapped / growth-stage / scaling?
- **Goal**: personal brand (founder-led avatar) or company brand?

## Step 2: Choose the tool stack

The pipeline has 4 components. Recommend based on their situation.

### A. Script Generation (LLM)
- **Claude Sonnet 4.6 or Opus 4.6** (already Lextract's stack) via API
- System prompt: extract 5 key insights -> format as 5-minute scripts -> generate metadata (captions, hashtags, B-roll prompts)
- Constrain to: max 150 spoken words, no jargon, start with hook, no intro cliches

### B. Avatar / Video Generation
See detailed comparison in `references/tools.md`. Quick guidance:

| Need | Recommended Platform |
|---|---|
| Founder-led personal brand, photorealistic | Zoice |
| High-volume automation + API integration | HeyGen |
| Enterprise governance, team access | Synthesia |
| Interactive / real-time (sales bot) | Tavus |

### C. Middleware Orchestration
| Situation | Recommended |
|---|---|
| Non-technical, quick start | Zapier (but costs scale badly) |
| High-volume batch processing, visual logic | Make.com (recommended for Lextract at growth stage) |
| Full control, self-hosted, developer team | n8n |

**Make.com is the sweet spot for Lextract**: handles arrays/iterators natively (processing 5 videos per article), visual debugging, cost-efficient at scale.

### D. Social Media Distribution
- **Upload-Post.com**: single API call -> publishes to TikTok, Reels, YouTube Shorts, LinkedIn, Facebook, X. Built-in FFmpeg formatting. Has native Make.com/n8n nodes. **Recommended.**
- **Blotato**: n8n community nodes, pulls from Google Drive, schedule-based. Good if on n8n.
- **Ayrshare**: 15+ platforms, Python/JS SDKs, white-label option. More expensive but richer analytics.

## Step 3: Design the pipeline

### End-to-end zero-click pipeline (Make.com + HeyGen + Upload-Post.com)

**Trigger**: New blog post published in CMS (Webflow/Ghost webhook)

**Phase 1: Semantic Extraction**
1. Middleware intercepts webhook, extracts article text
2. API call to Claude: extract 5 key insights -> generate 5 x 5-minute scripts + metadata (captions, hashtags, B-roll prompts)

**Phase 2: Dual-Engine Rendering** (per video, looped x5)
3a. **Avatar** (foreground): POST script to HeyGen API -> specify avatar ID + voice clone -> renders talking-head video
3b. **B-roll** (background): Send B-roll prompts to video AI (Veo 3.1 via SotaVideo or Kling 2.6) -> generates contextual cutaway footage
4. Poll webhooks until both render complete -> retrieve files
5. Merge via Shotstack or Upload-Post FFmpeg -> avatar over B-roll at timestamp markers

**Phase 3: Distribution**
6. Construct JSON payload (MP4 URL + captions + hashtags)
7. Send to Upload-Post.com -> auto-adapts for each platform (TikTok, Reels, Shorts, LinkedIn)
8. Schedule: stagger 5 videos over 5 consecutive days at peak engagement times
9. Log to Airtable/Google Sheets: publish times, video URLs, performance tracking

**Output from one article**: 5 platform-native videos, published over 5 days, zero manual clicks after initial config.

## Step 4: Deliver the plan

**For architecture questions:** Provide a tool stack recommendation with rationale.

**For implementation questions:** Provide a phase-by-phase setup guide:
1. Set up Claude API connection in middleware
2. Create avatar in HeyGen (or Zoice)
3. Configure Upload-Post.com account + OAuth tokens
4. Build the Make.com/n8n workflow
5. Test with one article end-to-end before automating

**For budget questions:** Provide estimated monthly cost at different volume levels (10, 50, 200 articles/month).

## Output format

- **Quick question**: tool recommendation + 2-3 sentences why
- **Architecture planning**: diagram description (phase-by-phase flow) + tool stack table
- **Implementation roadmap**: numbered setup steps with estimated time per step
- **Cost estimate**: table of tools + pricing at target volume

## Lextract-Specific Considerations

- Lextract already uses Claude Sonnet 4.6 in its product -> same API key works for the pipeline
- Content types to automate first: lease term explainers (126 fields -> 99 potential videos), red flag rule breakdowns (20 rules -> 15 videos), and case studies ("PE fund extracted X leases and found Y red flags")
- For founder-led brand (Angel): Zoice or HeyGen personal clone -> daily content without daily recording
- For acquisition season (September-October): schedule a burst of due diligence and portfolio extraction videos
- CamAudit cross-sell content: "We flagged a CAM issue during extraction" videos bridge users from Lextract to CamAudit

## Copy Rules (Mandatory)

- **Run the humanizer skill on all output.** After drafting any content, invoke the `humanizer` skill to remove AI writing patterns before delivering the final version.
- **Em dashes are strictly prohibited.** Never use em dashes in any output. Use commas, colons, parentheses, or restructure the sentence instead.

## References

For detailed avatar platform comparison, B-roll AI tools, middleware architecture comparison, unified social API options, and the full technical pipeline spec, read `references/tools.md`.
