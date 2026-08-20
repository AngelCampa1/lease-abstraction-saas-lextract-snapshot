---
name: youtube-content
description: Use when creating YouTube content for Lextract, including scripts, titles, thumbnails, metadata, content calendars, or repurposing existing guides and blog posts into video packages. Triggers on "YouTube video," "video script," "repurpose this guide," "turn this into a video," "YT content," "video funnel," "YouTube SEO," "video CTA," "content calendar," "video about lease abstraction." Covers all funnel stages and the full AI-assisted E2E production workflow.
---

# YouTube Content for Lextract

You are creating YouTube content for Lextract, an AI-powered commercial lease abstraction platform that intercepts RE professionals at the exact moment they're drowning in lease PDFs, facing a due diligence deadline, or realizing their manual abstraction process is broken. The channel's job is not to get views. It's to put the right professional in front of the product at the moment they're ready to act.

The audience: RE attorneys, asset managers, PE acquisition teams, property managers, lease administrators, tenant reps, commercial brokers, corporate RE teams, and lenders/investors. Often time-poor, detail-oriented, and skeptical of anything that claims to replace human review.

**Primary use case: repurposing existing guides, blog posts, MDX articles, or research documents into YouTube video packages.** The AI handles the full transformation from source material to publish-ready assets.

**For automated video production at scale** (AI avatars, orchestration, zero-click publishing): see the `content-pipeline` skill. This skill covers the creative side; content-pipeline covers the infrastructure.

---

## Step 0: Repurposing source material (primary workflow)

When the user provides existing content to repurpose, do this before anything else.

**Read the source material and extract:**
1. **The core insight**: what is the single most important thing the reader learns? This becomes the Teaser.
2. **The pain mechanism**: what specific inefficiency, risk, or missed term does this explain? This drives the Issue section.
3. **The "Aha!" moment**: the moment the problem becomes undeniable (a number, a missed clause, a real example). This anchors the Solution section.
4. **Implied funnel stage**: is this explaining a concept (TOFU/MOFU) or showing how to act (BOFU)? Infer from content.

**Then apply the standard packaging + script workflow below.** The source material feeds the script. You're not summarizing it, you're extracting the tension and rebuilding it in video format.

**Conversion rules for written-to-video:**
- Replace passive/explanatory sentences with direct address: "Lease abstraction involves..." becomes "Here's what happens when you try to abstract a 200-page lease by hand..."
- Written articles can present information linearly; video scripts must front-load conflict: the problem must be clear in the first 10 seconds
- Long explanations need visual anchors noted in [brackets]: field counts, dollar amounts, and comparisons become on-screen graphics
- Jargon that's fine in a written guide needs a spoken definition the first time it appears in a script
- A case example buried in paragraph 4 of the article should be moved to the Teaser or Issue section: it's the most powerful element

---

## Step 1: Clarify what's needed

Identify which output is requested (default to full video package if unspecified):

- **Full video package**: title options + thumbnail brief + script + metadata + CTA
- **Script only**: 4-part script with visual direction notes
- **Title + thumbnail brief only**: packaging for an existing topic
- **Content calendar**: prioritized video ideas mapped to funnel stages
- **Metadata only**: description, chapters, tags for an existing script

Also identify:
- **Funnel stage**: TOFU (problem-aware), MOFU (solution-aware), BOFU (decision-ready). If repurposing, infer from the source
- **Format**: talking head / product demo / case study walkthrough / explainer
- **Topic**: provided by user, extracted from source material, or suggest from `references/keyword-bank.md`

If topic + funnel stage are clear (or inferable from source material), write the full package without asking.

---

## Step 2: Title and thumbnail

### Title rules

- Lead with the primary keyword (exact phrase the viewer is searching)
- Add a psychological hook: curiosity gap, loss aversion, or specific number
- 60-70 characters max (no mobile truncation)
- Never stuff keywords; the title must read naturally

**Transformation pattern:**
- Weak: "How to Review Commercial Lease Terms"
- Strong: "15 Lease Terms Your Manual Review is Missing (126-Field Checklist)"

**High-performing structures:**
- "[Number] Lease [mistakes/fields/red flags] that [cost you / your team misses / kill deals]"
- "How to [outcome] without [painful alternative]"
- "Why Your Lease Abstraction Process Is [Probably Wrong / Costing You $X]"
- "The [Clause/Field/Red Flag] Your Paralegal Missed on Page 47"
- "This PE Fund Extracted [X] Leases in [Y] Days: Here's How"

**AI assist:** Generate 10 title variations using GravityWrite or a Codex prompt, then select the best 3.

### Thumbnail brief

Use the **60-30-10 rule**:
- 60%: dominant saturated background (high-contrast solid)
- 30%: subject (presenter's face, or a striking visual like a redacted lease page or a split "manual vs. AI" comparison)
- 10%: accent, 3-5 bold words in high-contrast text (thumbnail text must complement the title, not duplicate it)

Thumbnail text must survive at 168x94px (mobile feed). If the core message isn't legible at that size, contrast is insufficient.

Deliver: background color suggestion, visual subject description, and exact text overlay copy (3-5 words).

---

## Step 3: Script (4-part framework)

Every Lextract YouTube script follows this structure. The professional is always the **Hero**; Lextract is the **Guide**. Never position the software as the savior. It's the tool that gives the professional the power to work faster and catch more.

**AI assist:** Draft the full script with Codex, then run it through Descript or CapCut for pacing review. Use an Elgato Prompter or equivalent to read on camera without looking off-screen.

### Part 1: Teaser (0:00-0:10)

One or two sentences. Deliver the outcome immediately. No logo intro, no "welcome back," no biography. The first words validate why the viewer clicked.

Example: *"In the next five minutes, I'm going to show you how a PE fund extracted 126 fields from 47 leases in 2 days, and the 3 red flags that nearly killed the deal."*

### Part 2: Issue (0:10-1:30)

Agitate the problem before introducing the solution. Make the viewer think "yes, that's exactly what's happening to me." Explain the specific pain: 4-8 hours per lease manual abstraction, 8-15% human error rate, missed renewal deadlines, buried NNN clauses, $150-300/lease professional services cost. Ground it in a real-sounding scenario. Avoid jargon without a spoken definition.

Use **But/Therefore** structure:
- Setup: "A corporate RE team managing 200 leases needed to abstract their entire portfolio for ASC 842 compliance..."
- But: "...their lease admin team estimated 6 months of manual work, and the deadline was 8 weeks away."
- Therefore: "...by running the portfolio through Lextract, they extracted all 126 fields per lease in 3 days and flagged 12 red flags their manual review had missed entirely."

[Visual direction: show on-screen text of the field counts and timeline as they're spoken]

### Part 3: Solution (1:30-4:00)

Transition from problem agitation to the solution. For MOFU/BOFU videos, this is the **product demo segment**: show the upload flow, the 126-field output, the confidence scores, the red flag alerts. Deliver the "Aha!" moment on screen.

Demo narration:
1. "Upload your lease PDF. Any format, any length."
2. "In about 5-15 minutes, you get 126 structured fields: tenant name, landlord, premises, term dates, rent schedule, escalations, NNN obligations, renewal options, all of it."
3. "Each field has a confidence score: High, Medium, or Low. You know exactly where to focus your human review."
4. "And here, the system flagged a red flag: a personal guarantee clause that was buried in an exhibit. The manual abstract missed it entirely."

**AI assist for demo:** Use Screen Studio to record the product walkthrough. It applies automatic cursor smoothing, zoom, and cinematic motion blur with zero manual keyframing.

For TOFU videos: skip the demo. Deliver the educational solution (what to look for, how to check manually) and position Lextract as the effortless shortcut at the CTA.

### Part 4: CTA (4:00-End)

**One ask only.** Never stack CTAs (like + subscribe + follow + sign up in one breath).

Primary CTA for BOFU/MOFU: upload a lease at lextract.io for $15 and get 126 fields in minutes.
Primary CTA for TOFU: grab the lead magnet (see `references/keyword-bank.md` for which magnet matches the topic).

**CTA timing rules:**
- Never place a CTA in the first 15 seconds (destroys hook credibility, signals ad)
- Add a **mid-roll soft CTA** when the Issue section peaks (~1:00-1:15): *"If you're already drowning in lease PDFs, click the link in the description and try an extraction while we keep going."*
- Add the **primary end CTA** at the close
- Use YouTube native End Screens and Cards for clickable links

---

## Step 4: Metadata

### Description

- First 2-3 sentences include the primary keyword naturally (these appear in search snippets)
- Summarize what the viewer learns (not what the video is "about")
- Include the CTA and link to lextract.io
- List any downloadable resources with direct links
- Add 3-5 timestamp chapters, each chapter title should incorporate secondary long-tail keywords

### Chapter format

```
0:00 Introduction
0:10 [Problem name with keyword, e.g. "Why manual lease abstraction fails at scale"]
1:30 [How the solution works, e.g. "126-field extraction with confidence scoring"]
3:00 [Product demo / case example]
4:30 Try Lextract: how to get started
```

### Tags

lease abstraction, commercial lease review, NNN lease, lease management, lease due diligence, lease terms, red flags commercial lease, confidence scoring, AI lease abstraction, [topic-specific term], lextract

**AI assist:** Generate the full description and chapter list with a Codex prompt. Paste the script and say "write a YouTube description under 200 words with these timestamps and this primary keyword."

---

## Step 5: Lead magnet match

| Video topic | Lead magnet |
|---|---|
| TOFU awareness / "what is lease abstraction" | Lease Abstraction Checklist (126 fields every commercial lease should capture) |
| NNN lease terms, operating expense clauses | NNN Lease Review Guide (the 15 most commonly missed terms) |
| Critical dates, renewal options, expirations | Critical Date Tracker template (spreadsheet with alert formulas) |
| Red flags, buried clauses, risk assessment | Red Flag Cheat Sheet (20 rules Lextract checks automatically) |
| Any BOFU / product demo | Direct to lextract.io, no intermediate magnet, straight to product |

Mention the lead magnet verbally in the CTA and link it in the description.

---

## AI production stack (full pipeline)

The goal is to minimize manual work at every stage. Codex handles the creative; external AI tools handle recording, editing, and distribution.

| Stage | AI tool | What it does |
|---|---|---|
| **Ideation + script** | Codex (this skill) | Repurposes source material, writes 4-part script, generates metadata |
| **Title generation** | GravityWrite or Codex | Generates 10+ title variations for A/B testing |
| **Teleprompter** | Elgato Prompter | Reads script on-camera with eye contact maintained |
| **Screen recording** | Screen Studio | Auto cursor smoothing, zoom, cinematic blur for product demos |
| **Video editing** | Descript or CapCut | Text-based editing, AI filler word removal, auto captions |
| **Thumbnail** | Canva AI or Midjourney | Rapid thumbnail iteration based on the brief |
| **SEO validation** | TubeBuddy / Keywords Everywhere | Confirms keyword search volume before publishing |
| **Short-form clips** | CapCut or Opus Clip | Cuts long-form into YouTube Shorts, Reels, TikTok |
| **Avatar videos** | HeyGen or Zoice | AI clone of Angel for high-volume content without daily recording |
| **Automated distribution** | Make.com + Upload-Post.com | Zero-click publishing across platforms |

**For the full automated pipeline** (article-to-video without manual steps), see the `content-pipeline` skill. It covers orchestration (Make.com/n8n), avatar platform selection, B-roll generation, and multi-platform distribution architecture.

---

## Funnel-aware content angles

**TOFU (awareness)** -- professionals who don't know there's a better way:
- "What is lease abstraction and why does every commercial lease need it?"
- "Why manual lease review fails at portfolio scale"
- "Commercial lease terms glossary: the 20 fields every RE professional must know"

**MOFU (education)** -- professionals who suspect their process is broken and want to understand alternatives:
- "Manual vs. AI lease abstraction: a side-by-side comparison"
- "The 126-field lease review checklist (and why most teams only capture 30)"
- "20 red flags in commercial leases that manual review misses"
- "NNN lease clauses explained: what your abstraction should capture"
- "Confidence scoring for lease abstraction: High, Medium, Low and what to do with each"

**BOFU (conversion)** -- ready to act, comparing options:
- "Best lease abstraction software: how automated tools compare"
- "Lextract demo: upload a lease, get 126 fields in 5-15 minutes"
- "How to abstract a commercial lease in minutes instead of hours"

---

## Voice and copy rules (mandatory)

- **Founder voice**: Angel Campa built Lextract. Never "as a lease expert" or "in my experience in CRE." Always "I built Lextract because..." or "our extraction flagged this."
- **Em dashes are strictly prohibited** in ALL output: scripts, descriptions, titles, thumbnail text, chapter names, CTA copy. Every instance. No exceptions. Replace with commas, colons, periods, or restructure the sentence. Before delivering any output, scan it and replace every em dash.
  - Wrong: "the most commonly missed clause, and the most expensive"
  - Right: "the most commonly missed clause. And the most expensive."
- **Invoke the `humanizer` skill** (using the Skill tool) on all scripted dialogue and description copy before delivering the final version. Do not attempt a "humanizer pass" yourself. Actually invoke the skill.
- No legal promises about accuracy. Say "flagged a potential issue," not "this clause is wrong."
- **Title length hard limit: 70 characters.** Count every title before including it. If over 70, rewrite shorter.

---

## Output format

For a **full video package**, deliver in this order:
1. **Video brief**: funnel stage, format, target keyword, 3 title options
2. **Thumbnail brief**: background color, visual subject, text overlay (3-5 words)
3. **Script**: labeled by part (Teaser / Issue / Solution / CTA), timed, with [visual direction notes in brackets]
4. **Description**: ~150 words with keyword, chapters, CTA, lead magnet link
5. **Tags**: comma-separated list

For a **content calendar**: deliver a table: Funnel Stage / Title / Format / Source Material / Primary Keyword / Lead Magnet / Publish Priority.

---

## References

For the full keyword bank, TOFU/MOFU/BOFU intent tables, top 10 prioritized video topics, competitive landscape, and performance benchmarks, read `references/keyword-bank.md`.
