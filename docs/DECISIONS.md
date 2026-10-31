# Decisions, assumptions and open points

Required by PLATFORM_SPEC.md §18: every assumption and every conflict between the spec and the outline is recorded here rather than resolved silently.

## 1. Open decisions for the authors (§12): defaults implemented

| # | Question | Default in the code | Where to change it |
|---|---|---|---|
| O-1 | Topic coverage before a transition: information or hard lock? | Information only. Gaps are shown; the inner referee decides. | Admin → Settings (`transitionTopicLock`) |
| O-2 | Low-cost entry (patch or card) | Product type `PATCH` exists; a `tutorial-patch` product is seeded **unlisted**. | Admin → Products → List |
| O-3 | Languages | English only. `messages/en.json` + `src/lib/i18n.ts`: locale from cookie or `Accept-Language`, English fallback. Add `de`, `es`, `pt` by adding a JSON file and the locale code. **Most UI strings are still inline English and need extracting.** | `src/lib/i18n.ts` |
| O-4 | When to open pair and circle matching | Phase 2. Data model exists (`Pair`, `Circle`, `CircleMember`, `User.region`); no UI. The "Circle of trust" sharing option is shown but disabled. | — |
| O-5 | VAT, invoicing, legal entity, imprint address | `VAT_MODE=off` (prices are final). `stripe_tax` turns on Stripe Tax. Imprint, privacy and shop-terms pages are placeholders with a visible TODO. | `.env`, `content/legal/*` |
| O-6 | Domain and final title | Title: "The Consciousness Development Game". Domain via `APP_URL`. QR codes embed `APP_URL`, so **the domain must be final before patches are printed.** | `.env`, `messages/en.json` |
| O-7 | Reviewers see the author? | Anonymous. Review queue and public quest lists never include author identity. The author can tick "credit me if accepted" (`creditAuthor`). | `src/lib/quests.ts` |

## 2. Conflicts between the outline and the spec (or within the outline)

1. **Challenge topics.** The outline says "Each challenge belongs to one topic of the level", but its own worked example *The Honest Inventory* lists two topics (security and survival; material competence). The item keeps both topics, as in the outline's example. The content check reports it as a hint, not an error. *Authors: which one is intended?*
2. **Threshold letter vs Threshold Quest completion.** The outline's "Complete when" for *Yes to the Earth* includes "the letter is in the log, and the inner referee confirms the three questions". The platform treats them as two separate player actions: the letter (any answer, saved every time) and completing the quest through the referee dialog. The Level 1 → 2 transition needs both: the quest complete **and** the latest letter answered *yes*.
3. **What counts for transition condition 1.** The outline says "at least one challenge or quest recorded in their log". Exercise sessions and free entries therefore do **not** count for condition 1, but they **do** count in the topic map's entry numbers (§5.1 asks for "the number of log entries for each" topic).
4. **"Players from different circles" (§5.6).** Circles don't exist yet. Interpretation: completions by players in the same circle count once; players without a circle count individually.
5. **Export artefact.** The Drive export had `**\*\*Movement, song and dance.\*\***` (escaped asterisks). In `docs/source/game-outline.md` it was cleaned up to bold text.
6. **Level 8 colour.** The spec says "all of them or white". The swatch is a conic gradient of all seven colours; the page accent stays black and white.

## 3. Assumptions (software)

### Content
- **Markdown, not MDX.** Item files keep the `.mdx` extension the spec asks for, but bodies are rendered as plain Markdown (`marked`). Reasons: no JSX components are needed yet, the outline contains HTML comments that MDX rejects, and the previous MDX library (`next-mdx-remote`) had an open security advisory. Switch to MDX when embeds are needed.
- **Single source for the authors' wording.** Docs and tutorial pages don't copy text. Their frontmatter lists outline headings (`fromOutline: [...]`) and the text is pulled from `docs/source/game-outline.md` at render time. Re-exporting the Google Doc updates the site.
- `docs/source/game-outline.md` holds the full outline **except the worked examples' full texts**, which live only in `content/levels/01-red/items/*.mdx` (copied verbatim) to avoid two copies drifting apart.
- The tutorial contains no example challenges, because the outline gives none for the tutorial. None were invented. Audio and video slots exist in `content/tutorial/*.md` frontmatter (`audio`, `video`, `transcript`); videos expect a `.vtt` caption file next to them.
- Quest items whose outline text consists only of stages have no body; the stages are the instructions.
- "The Red Level – 111 Root Challenges" was not imported (spec §7.1). Adding items means adding `.mdx` files to `content/levels/01-red/items/`.
- Level colours were chosen for WCAG AA contrast with white text: red `#B3261E`, orange `#C2570C`, yellow `#8A6D00` (a dark gold, since pure yellow fails contrast), green `#2E7D32`, blue `#1F5FAD`, indigo `#3F3A9E`, violet `#7A3B9E`. *Authors may want to adjust these to the artwork.*

### Auth and entry flow
- **Own magic-link implementation** instead of Auth.js: the link must bind a player code atomically at click time, which is simpler to guarantee directly. Tokens and session ids are stored only as HMAC hashes. Sessions last 60 days in an HTTP-only cookie.
- The e-mail link opens a page with one button. The token is consumed only on that POST, so e-mail security scanners that prefetch links cannot use it up.
- Links expire after 30 minutes and work once. If two people request links for the same unused code, the first click wins and the second sees "This code is already in play".
- Code alphabet: `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 symbols, 10 characters ≈ 8·10¹⁴ combinations). Input is case-insensitive and ignores spaces and dashes.
- Rate limits (stored in Postgres): code activation 20 per hour per IP and 8 per hour per e-mail; sign-in 20 per IP and 5 per e-mail; support 10 per hour.
- Unknown and malformed codes get the same answer ("could not find this code"). An activated code gets the neutral "already in play" with a contact link. Nothing about the holder is revealed.
- Admin bootstrap: addresses in `BOOTSTRAP_ADMINS` get admin, reviewer and support roles when their account is created. Further roles are assigned in Admin → Roles.
- Changing the e-mail address is not implemented yet (it needs a verification flow). Players can see it in Settings.

### Game behaviour
- **Focus level.** `User.focusLevel` lets a player choose to work in an earlier level ("Work in this level"). Home shows the focus level, and the label is neutral. `currentLevel` is the furthest level opened and never goes down.
- A completed item can be played again ("Play it again" sets it back to in progress). The earlier log entries stay.
- Entry visibility is checked at query time against the author's current visibility, so switching to private hides everything immediately without rewriting entries.
- Public sharing soft limit: past the limit (default 1 per 30 days) the player sees a gentle notice and can still share with one more click.
- Gratitude reminders: the field `gratitudeReminder` exists but there is **no UI and no sending**, because a reminder needs a scheduler. Nothing nags.
- On account deletion, quests already accepted as core quests stay in the game without an author. Support requests are deleted with the account.

### Shop
- Stripe Checkout with inline `price_data`; prices live in the platform's `Variant` table. Payment methods (cards, SEPA, MB WAY, Multibanco) follow the Stripe dashboard settings.
- Seeded prices (T-shirt €35, sweatshirt €65, patch €5) are **placeholders** for development. *Admins set the real prices.*
- Orders start as `PENDING` and become `PAID` only through the signed webhook. The webhook is idempotent and never touches `User`.
- Product images: `Product.imagePath` points to `public/art/`. Until the authors deliver files, a neutral striped placeholder shows "Artwork to follow".

### Infrastructure
- Local development and tests use **embedded PostgreSQL** (npm package `embedded-postgres`), because Docker and Postgres are not installed on the development machine. Production needs an EU-region PostgreSQL. *Not chosen: ask the authors before committing to a paid service.*
- E-mail: `EMAIL_PROVIDER=console` writes mails to `.mail-outbox/`. `smtp` works with any provider that offers SMTP (Postmark and Brevo both do). *The provider is not chosen yet (paid service).*
- Next.js telemetry is disabled (`NEXT_TELEMETRY_DISABLED=1`). No analytics anywhere.
- Prisma 6 (not 7) and Next.js 15 (not 16) for stability.
- `npm audit` still reports two advisories in build-time tooling only: `deepmerge-ts` inside `@prisma/config` (reads our own config file) and `postcss` bundled inside Next.js (processes our own CSS). Re-check when upgrading Prisma or Next.

## 4. Not done yet in phase 1 / needs verification

- Lighthouse accessibility score not measured yet. The pages use native controls, labels, one `<h1>` each, visible focus styles, a skip link and AA colour contrast.
- Keyboard-only walkthrough not done by a person yet.
- Crisis line numbers in `content/support/crisis-lines.yml` must be **verified by the admins** before launch.
- Legal texts (imprint, privacy, shop terms) are placeholders (O-5).
- Order confirmation e-mails are plain text.
- Stripe has been tested with signed test events only, not against a real Stripe test account.
