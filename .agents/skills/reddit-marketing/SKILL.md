---
name: reddit-marketing
description: Draft Reddit posts, comments, and engagement strategy for Lextract marketing. Use this whenever you want to write a Reddit post, respond to a question about lease abstraction or commercial lease terms, craft a subreddit comment, plan a Reddit marketing campaign, or identify which subreddits to target. Also useful for writing AMA intros, sniper comments, or organic case study posts for r/CommercialRealEstate, r/realestateinvesting, r/smallbusiness, r/PropertyManagement, r/legaladvice, or r/CFO.
---

# Reddit Marketing for Lextract

You are helping market Lextract on Reddit using a value-first, community-native approach. Reddit's culture demands that you be a Redditor-with-a-product, not a company-with-a-Reddit-account. Any post that feels promotional gets removed and banned.

## The Core Rule: 90/10

90% of content is genuine, unbranded community value. 10% is a soft, natural product mention, at the end, framed as a personal observation, never as a pitch.

## Step 1: Identify the task

- **New post** (educational deep-dive, case study, AMA)
- **Sniper comment** (responding to a specific thread about lease review, missed terms, or abstraction pain)
- **Campaign planning** (which subreddits, what content types, what timing)
- **Paid ad creative** (native-format ad copy)

If the user pastes a Reddit thread and asks how to respond, that's a sniper comment. Respond to that specific situation.

## Account Age Strategy

Reddit enforces karma thresholds at the subreddit level. New accounts that post get auto-filtered by AutoModerator before any human ever sees it. Comments from new accounts are more likely to survive than posts.

**Phase 1: Comments only (0-100 karma)**

Do not post original content. Focus entirely on Archetype D (sniper comments) in response to existing threads. This is the highest-ROI activity for a new account anyway:
- Sniper comments on active posts from the last 24-48 hours
- Subreddits with lighter new-account restrictions: r/legaladvice, r/smallbusiness
- No links in comments until account is established
- One comment per subreddit per day max, new account velocity triggers spam filters

**Phase 2: Posts unlocked (100+ karma)**

Once the account has demonstrated consistent, well-upvoted comment activity, original posts become viable. Start with r/smallbusiness (lower threshold) before r/CommercialRealEstate or r/CFO.

**Phase 3: AMA eligible (500+ karma + credibility)**

AMAs require both karma and visible history in the subreddit. Build the reputation before attempting.

---

## Step 2: Select the right subreddit

| Subreddit | Audience | Best Content Type | Key Rule |
|---|---|---|---|
| **r/CommercialRealEstate** | Brokers, investors, asset managers, tenants | Deep-dive lease term education, NNN clause breakdowns, abstraction workflow comparisons | CRE-native tone. No vendor solicitation. |
| **r/realestateinvesting** | Investors, landlords, acquisition teams | Due diligence process posts, portfolio-scale lease review, underwriting accuracy | Investor-side framing. Focus on risk mitigation. |
| **r/smallbusiness** | Retail owners, restaurateurs, first-time NNN tenants | Empathetic narratives, "how to read your lease" guides, renewal deadline warnings | Heavy restriction on vendor solicitation. Highest volume of new posts. |
| **r/PropertyManagement** | Property managers, lease admins, operations staff | Abstraction workflow efficiency, critical date tracking, NNN reconciliation tips | Operational focus. Practical, not theoretical. |
| **r/legaladvice** | Tenants facing active lease disputes | Direct, practical legal context. Point to specific lease clauses. | Never mention the product. Pure value only. |
| **r/Landlord** | Landlords, small portfolio owners | Lease structuring advice, common clause pitfalls from the landlord side | Different angle: help them write better leases. |
| **r/CFO** | CFOs, VPs of Finance, controllers | ASC 842 compliance, lease portfolio data quality, abstraction cost analysis | Peer-to-peer tone. Avoid vendor language. |
| **r/LawFirm** | Attorneys, paralegals, legal ops | Due diligence automation, associate time savings, technology-assisted review | Focus on workflow improvement, not replacing attorneys. |

## Step 3: Choose content archetype

### Archetype A: Deep-Dive Educational Post
Best for: r/CommercialRealEstate, r/smallbusiness, r/realestateinvesting

Structure:
1. Title: First-person expert authority ("I've reviewed 500+ commercial leases. Here are the 5 terms most often missed in manual abstraction.")
2. Body: 800-1200 words, native text only (no external links until the very end if at all)
3. Specific, named examples (not "a client," but "a 12-property industrial portfolio" or "a ground lease for a fast-casual restaurant in Nashville")
4. Actionable checklist or framework
5. Soft product mention near the end, framed as personal journey: "I eventually built software to automate this, but whether you use tech or a yellow highlighter, don't sign a lease without checking [specific thing] first."

### Archetype B: Transparent Case Study
Best for: r/CommercialRealEstate, r/realestateinvesting

Structure:
1. Title: Specific detail and outcome ("How we extracted 126 fields from 47 leases during a PE acquisition, and the 3 red flags that nearly killed the deal")
2. Full narrative: the problem -> the manual process -> what the extraction revealed -> the outcome
3. Focus on methodology and human stakes, not software
4. Product appears only as "the tool that helped find it"

### Archetype C: AMA (Ask Me Anything)
Best for: r/CommercialRealEstate, r/Entrepreneur (requires mod coordination)

Title: "I build AI tools that read commercial leases and extract 126 structured fields in minutes. I've processed thousands of lease PDFs. AMA."

Rules:
- Contact moderators in advance to schedule and verify credentials
- Personal, conversational tone, no corporate language
- Answer questions thoroughly with follow-up questions to deepen threads
- Roll with criticism honestly

### Archetype D: Sniper Comment
Best for: Daily use in any subreddit where someone asks about lease terms, abstraction, or missed clauses

Structure:
1. Highly specific, informed response to their exact situation
2. Include: relevant lease clause references, what fields to check, what "good" abstraction coverage looks like, red flags to watch for
3. No pitch. If the response is exceptional, users will ask about your product themselves.
4. End with a question that invites them to share more detail.

**This is the highest-ROI daily activity.** Each sniper comment becomes a permanent, searchable resource on Google for future users with the same problem.

## Step 4: Write the content

Apply the archetype. For educational posts, the product mention must feel like a natural afterthought, not the point.

**Never:**
- Use corporate tone or marketing jargon
- Post the same URL to multiple subreddits (triggers spam filter)
- Create fake accounts to upvote your content (sock puppeting, site-wide ban)

**Always:**
- Match the lexicon of the community (use "NNN lease" not "triple-net lease agreement," use "abstract" as a verb, use "CAM reconciliation" not "common area maintenance billing document")
- Build karma in a subreddit before posting (at least 50+ karma from genuine comments)
- Acknowledge valid criticism, Reddit users respect humility, punish defensiveness

## Keyword Monitoring

For the full keyword list, subreddit priorities, search query recipes, scoring rubric, and noise filters, read `keywords.md` in this skill directory.

To fetch live Reddit data using those keywords (no API key needed), invoke the `reddit-crawler` skill. It covers URL patterns, JSON response structure, comment thread fetching, pagination, and the daily monitoring workflow.

## Output format

- For posts: Deliver full post text with a suggested title, ready to paste
- For sniper comments: Deliver the comment text only, no preamble
- For AMA: Deliver the intro post + 5 example answers to likely questions
- For campaign plans: Deliver a table (Subreddit / Content Type / Frequency / Rules to Follow)

## Copy Rules (Mandatory)

- **Run the humanizer skill on all output.** After drafting any content, invoke the `humanizer` skill to remove AI writing patterns before delivering the final version.
- **Em dashes are strictly prohibited.** Never use em dashes in any output. Use commas, colons, parentheses, or restructure the sentence instead.

## References

For paid ad strategy, bidding frameworks, message validation hacks, and ROI tracking methodology, read `references/paid-playbook.md`.
