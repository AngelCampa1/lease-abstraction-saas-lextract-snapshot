# Reddit Keyword Monitoring -- Lextract

Use this file with the `reddit-crawler` skill to find sniper comment opportunities.

---

## Target Subreddits

### Tier 1: High Volume, High Intent

| Subreddit | Why |
|---|---|
| r/CommercialRealEstate | Brokers, investors, and tenants discussing lease terms, NNN structures, and due diligence. Core audience. |
| r/realestateinvesting | Investors evaluating acquisitions, reviewing tenant leases, and managing portfolios. High dollar amounts. |
| r/commercialrealestate | Alternate casing/community. Same audience as Tier 1 primary. |

### Tier 2: Specific Buyer Personas

| Subreddit | Why |
|---|---|
| r/smallbusiness | Retail owners, restaurateurs, first-time NNN tenants who need to understand their lease. |
| r/PropertyManagement | Property managers dealing with lease administration, renewal tracking, and NNN reconciliation. |
| r/Landlord | Landlords structuring leases, reviewing tenant obligations, and managing portfolios. |

### Tier 3: Monitor and Engage Selectively

| Subreddit | Why |
|---|---|
| r/legaladvice | Tenants and landlords in active lease disputes. Pure value comments only, never mention product. |
| r/RealEstate | Mostly residential, but commercial lease questions appear. Worth a weekly keyword scan. |
| r/LawFirm | Attorneys discussing legal tech, due diligence workflows, and associate efficiency. |
| r/CFO | Controllers and VPs of Finance dealing with ASC 842 compliance and lease portfolio data. |

---

## Keyword Groups

### Group 1: Lease Abstraction (highest intent, always engage)

```
lease abstraction
lease abstract
abstracting leases
lease abstraction software
lease abstraction tool
lease abstraction service
automated lease abstraction
AI lease abstraction
lease data extraction
lease field extraction
lease summary template
lease abstraction checklist
commercial lease abstraction
lease abstraction cost
outsource lease abstraction
```

### Group 2: NNN Lease Questions (high intent)

```
NNN lease
triple net lease
NNN charges
NNN lease explained
NNN lease terms
NNN lease problems
understanding NNN lease
NNN lease review
NNN lease negotiation
NNN reconciliation
NNN lease dispute
what does NNN include
NNN tenant responsibilities
modified gross lease
gross lease vs NNN
full service lease vs NNN
```

### Group 3: Commercial Lease Review and Due Diligence (high intent)

```
commercial lease review
lease review checklist
lease due diligence
commercial lease terms
commercial lease clause
lease term sheet
lease critical dates
lease renewal deadline
lease expiration tracking
lease option period
rent escalation clause
operating expense clause
assignment and subletting
co-tenancy clause
exclusive use clause
tenant improvement allowance
```

### Group 4: Lease Management and Administration (medium-high intent)

```
lease administration
lease management software
lease portfolio management
lease data management
ASC 842 lease
lease accounting
lease compliance
lease audit
lease tracking
lease database
lease repository
lease document management
centralized lease data
```

### Group 5: Red Flags and Risk (medium intent, often actionable)

```
missed lease renewal
lease renewal missed
lease expiration surprise
buried lease clause
hidden lease terms
landlord lease trick
unfavorable lease terms
lease risk
bad commercial lease
commercial lease mistake
lease gotcha
lease trap
lease fine print
personal guarantee commercial lease
radius restriction lease
demolition clause lease
relocation clause lease
```

### Group 6: Cost and Efficiency Pain (medium intent, person ready to act)

```
lease abstraction cost
how long to review a lease
manual lease review
lease review takes too long
paralegal lease review
outsource lease review
too many leases to review
lease review backlog
due diligence timeline
portfolio acquisition leases
bulk lease review
```

### Group 7: CAM / Operating Expense Context (medium intent, CamAudit cross-sell opportunity)

```
CAM reconciliation
CAM charges
CAM overcharge
CAM audit
operating expense reconciliation
landlord overcharging CAM
management fee CAM
CAM cap
CAM gross-up
pro-rata share
common area maintenance
landlord billing error
NNN lease dispute charges
```

### Group 8: Legal Tech and PropTech (lower volume, higher quality leads)

```
legal tech commercial real estate
proptech lease
AI commercial real estate
real estate technology
lease tech
legal document extraction
document AI commercial
automated document review lease
```

---

## Search Query Recipes

### Quick Daily Scan (run every 24h, site-wide)

```
q=lease+abstraction&sort=new&t=day
q=NNN+lease+review&sort=new&t=day
q=commercial+lease+terms&sort=new&t=day
q=lease+renewal+missed&sort=new&t=day
q=lease+due+diligence&sort=new&t=day
q=commercial+lease+review&sort=new&t=day
q=lease+critical+dates&sort=new&t=day
q=NNN+lease+explained&sort=new&t=day
```

### Tier 1 Subreddit Scans (daily, restrict_sr=1)

```
r/CommercialRealEstate  + q=lease+abstraction
r/CommercialRealEstate  + q=NNN+lease
r/CommercialRealEstate  + q=lease+review
r/CommercialRealEstate  + q=due+diligence
r/realestateinvesting   + q=lease+review
r/realestateinvesting   + q=NNN+lease
r/realestateinvesting   + q=commercial+lease
r/realestateinvesting   + q=due+diligence+lease
```

### Tier 2 Subreddit Scans (2-3x per week)

```
r/smallbusiness          + q=commercial+lease
r/smallbusiness          + q=NNN+lease
r/smallbusiness          + q=lease+renewal
r/smallbusiness          + q=landlord+lease
r/PropertyManagement     + q=lease+abstraction
r/PropertyManagement     + q=NNN+reconciliation
r/PropertyManagement     + q=lease+renewal
r/Landlord               + q=commercial+lease
r/Landlord               + q=NNN+lease
r/Landlord               + q=lease+terms
r/legaladvice            + q=commercial+lease+dispute
r/legaladvice            + q=NNN+lease
r/CFO                    + q=lease+accounting
r/CFO                    + q=ASC+842
r/LawFirm                + q=lease+review
r/LawFirm                + q=due+diligence
```

### Extended Scan (weekly, finds evergreen threads worth commenting on)

```
q=lease+abstraction+software&t=week
q=NNN+lease+negotiation&t=week
q=commercial+lease+checklist&t=week
q=lease+renewal+deadline&t=week
q=rent+escalation+clause&t=week
q=operating+expense+audit&t=week
q=lease+critical+dates&t=week
q=CAM+reconciliation+lease&t=week
```

---

## Relevance Filter: Is This Post Actually for Us?

After crawling, apply this filter before scoring. **Skip the post if any of these are true:**

| Rejection Rule | Why |
|---|---|
| Post is about a residential lease (apartment, house, rental) | We only cover commercial leases |
| OP is asking about residential tenant rights (security deposit, eviction, rent control) | Wrong product entirely |
| Post is purely about real estate investment returns with no lease-level detail | No abstraction pain |
| Post body contains: "my apartment", "my landlord raised my rent", "section 8", "housing" | Residential signal |
| Post is asking how to become a landlord or buy residential property | Not our audience |
| No commercial lease context (no mention of NNN, CAM, commercial, retail, office, industrial, tenant, lease terms, due diligence) | Too generic |

**Pass the post if at least one of these is true:**

| Relevance Signal | What it means |
|---|---|
| Mentions lease abstraction, lease review, or lease summary | Direct match |
| Mentions NNN, CAM, operating expenses, or reconciliation in a commercial context | Lease term complexity, good fit |
| Asks about lease due diligence for an acquisition or portfolio | Bulk abstraction opportunity |
| Mentions missed renewal, critical dates, or buried clauses | Red flag detection value |
| Mentions the time or cost of reviewing commercial leases | Efficiency pain, core value prop |
| Uses commercial tenant/landlord language ("my lease", "lease terms", "tenant improvement") | Right audience |

---

## Scoring: When to Respond

Only score posts that passed the relevance filter above. Prioritize threads that score 3+.

| Signal | Score |
|---|---|
| Posted in last 48 hours | +1 |
| Posted in last 24 hours (bonus, replaces above) | +2 |
| OP is actively reviewing or signing a commercial lease | +1 |
| Specific lease term or clause confusion evident | +1 |
| Mentions time/cost pain of lease review | +1 |
| No substantive answer yet | +1 |
| Post has 3+ upvotes (validated pain) | +1 |
| Keyword from Group 1, 3, or 5 | +1 |
| Post is NOT archived and NOT locked | required (skip if false) |

**Score 3-4:** Leave a sniper comment.
**Score 5+:** Prioritize, high-value engagement opportunity.

---

## Noise Filters (skip even if relevance filter passes)

- Posts older than 72 hours (unless it's still getting new comments)
- Posts where an attorney or CRE professional has already given a comprehensive, substantive answer
- Posts where the OP has already resolved the situation
- Posts with `archived: true` or `locked: true` (cannot comment)
