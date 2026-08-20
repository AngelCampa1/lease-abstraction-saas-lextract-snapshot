# Review Log

Date: 2026-05-15

## Source Verification

SaaSHub:

- Verified source: [Submit a Product](https://www.saashub.com/services/submit)
- Requirements captured: released product, English site, own domain, categories, competitors, domain email verification, approval process.

AlternativeTo:

- Verified sources: [Login FAQ](https://blog.alternativeto.net/posts/login-faq/) and [app page design notes](https://alternativeto.net/news/2024/5/introducing-the-new-about-app-pages-design-on-alternativeto-/)
- Requirements captured: verified account for contribution features; app pages include name, icon, short description, license model, app type, platform, screenshots, links, features, tags, alternatives, comments, and reviews.
- Note: AlternativeTo does not expose a complete current public submission spec. The package uses AlternativeTo-owned documentation and visible app-page fields.

Product Hunt:

- Verified sources: [How to post a product](https://help.producthunt.com/en/articles/479557-how-to-post-a-product), [featuring guidelines](https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines), [launch guide](https://www.producthunt.com/launch)
- Requirements captured: personal account, direct product URL, clean product name, tagline, topics, thumbnail, pricing tag, status, gallery, YouTube video behavior, 260-character description, makers, first comment, scheduling at 12:01 AM PST.

G2:

- Verified sources: [Research FAQ](https://research.g2.com/methodology/research-faq), [pricing guide](https://sell.g2.com/hubfs/G2-External-Pricing-Guide-PDF-FY26.pdf?hsLang=en)
- Requirements captured: B2B eligibility, one product profile, exact product name, accessible website, category evidence, free profile capabilities, "Users Love Us" threshold.

BetaList:

- Verified sources: [submission guidelines](https://betalist.com/criteria), [submission terms](https://betalist.com/terms/submissions), [support FAQ](https://betalist.com/support)
- Requirements captured: new or recently launched technology startup, own domain, decent landing page, access path, editorial discretion, review timing, priority notes.

## Repo Truth Review

Claims checked against repo docs and public knowledge files:

- $15 per lease.
- 5-pack at $65 and 10-pack at $120.
- No subscription.
- Credits never expire.
- 126 structured fields.
- 20 red flag checks.
- Typical processing time: 5-15 minutes.
- Export formats: Excel, Word, PDF.
- Contacts: `angel.campa@lextract.io`.

## Humanizer Pass

Edits applied:

- Removed long dash punctuation.
- Used direct sentences instead of inflated claims.
- Avoided generic phrases such as "revolutionary", "game-changing", "powerful platform", and "seamless solution."
- Kept descriptions specific to lease abstraction instead of broad AI automation.
- Varied the long descriptions by platform.
- Preserved a few plain, human details in the Product Hunt first comment so it does not read like a press release.

## Copy Review

Checks completed:

- No unsupported customer counts, logos, review scores, or accuracy guarantees.
- No legal, tax, or accounting advice claims.
- No "replace attorneys" claim.
- No "instant" processing claim.
- Each platform has a distinct lead angle:
  - SaaSHub: alternatives marketplace.
  - AlternativeTo: alternative to manual, outsourced, and generic AI workflows.
  - Product Hunt: maker story and practical product explanation.
  - G2: B2B buyer evidence and review collection.
  - BetaList: recently launched AI startup.

## CRO Review

CTA mapping:

- SaaSHub: `https://lextract.io/lease-abstraction-software`
- AlternativeTo: `https://lextract.io`
- Product Hunt: `https://lextract.io`
- G2: `https://lextract.io` plus evidence URLs.
- BetaList: `https://lextract.io`

Support CTAs:

- Upload: `https://lextract.io/upload`
- Pricing: `https://lextract.io/pricing`
- Sample report: `https://lextract.io/sample-report`

## Character Checks

- Product Hunt description: 175 characters, under the 260-character limit.
- 60-character variant: 46 characters.
- 100-character variant: 94 characters.
- 160-character variant: 135 characters.
- Removed bracketed Product Hunt launch URL markers from social copy because the final launch URL is not known until Product Hunt generates it. Added a note to replace the search fallback with the direct Product Hunt post URL once available.
- Generated final Product Hunt gallery assets at 1270x760 and a 240x240 thumbnail under `docs/getting-badges/assets/`.

## Final QA Notes

- The package is copy-paste ready for directory forms and review outreach.
- Product Hunt gallery art and thumbnail are prepared. The only optional launch asset not included is a YouTube demo URL.
- Existing screenshots were used as source material for Product Hunt gallery art.
- Account creation and live submission are owner actions because they require platform login.
