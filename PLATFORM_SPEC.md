# The Consciousness Development Game: Platform Spec v1

Build brief for Claude Code. Place this file at the repo root (or rename it to `CLAUDE.md`) together with the source text in `docs/source/game-outline.md`. To get that file, export the Google Doc "The Consciousness Development Game" as Markdown.

Authors of the game: Yannick Bennesch and Diana Luz Ruffin Escribano.
Status: first version. Content for Levels 2 to 8 does not exist yet.

---

## 1. What the platform is

The platform has three jobs:

1. **Game home.** A private player profile holds the tutorial, the level materials, the player log, and the player's own quests.
2. **Merch shop.** It sells the *symbols of recognition*: T-shirts and sweatshirts with Diana Luz's drawings. Each one carries a patch with a QR code and a player code. Buying a black-and-white piece is how a player enters the game.
3. **Documentation.** Public pages explain the game: why we play, how we play, what we play, the mechanics, the level structure, Sacred Sundays, and support.

## 2. Design principles (non-negotiable)

These come from the game's rules. The software must not undermine them.

- **The inner referee is the only authority on completion.** The platform never decides that a challenge, quest or level is complete. It records what the player declares.
- **No external rewards.** No points, badges, streaks, leaderboards, progress percentages, or notifications that push the player to play. Experience is the growing record of honest log entries.
- **A symbol records a transition. It does not cause one.** Buying a garment never changes a player's level or unlocks content. Shop and game state are separate.
- **Private by default.** Log entries, quests and the profile are private unless the player changes that.
- **Visibility is reciprocal.** Only players who have made themselves visible can see other players' public entries, public quests, and pair or circle suggestions. A player who stays private sees nothing of other players.
- **No penalty for open items.** A challenge can stay open indefinitely. Any item can be postponed with no consequence and no reminder nagging.
- **The spiral, not the ladder.** Earlier levels stay open forever. Returning to an earlier level is a normal action, not a regression, and the UI must not frame it as one.
- **Levels describe where a player is working, not what they are worth.** No public display of anyone's level except through the garment they choose to wear.
- **Data minimisation.** Collect only an e-mail address and a player code to start. Everything else is optional.

## 3. Users and roles

| Role | Who | Can |
|---|---|---|
| Visitor | anyone | read public docs, browse and buy in the shop, activate a player code |
| Player | anyone with an activated player code | everything in §5 |
| Reviewer | Yannick, Diana Luz; later advanced players | review community quests, promote them to core quests |
| Support contact | Yannick, Diana Luz; later advanced players | receive support requests |
| Admin | Yannick, Diana Luz | manage content, player-code batches, orders, catalysts, roles |

A person can hold several roles.

## 4. Entry flow (player code activation)

1. A player code is a random string with no personal data, e.g. 10 characters from an unambiguous alphabet (no 0/O, 1/I/L), shown in groups: `K7QX-M4RT-2W`. Codes are generated in batches by an admin before patches are printed.
2. The QR code on the patch points to `https://<domain>/play?code=<code>`. The page pre-fills the code. Manual entry must also work.
3. The player enters the code and an e-mail address.
4. The platform sends an e-mail with a sign-in link (magic link, no password).
5. Following the link creates the player account, binds the code to it, and opens the profile on the tutorial.
6. A code can be activated once. If someone tries an already-activated code, show a neutral message ("This code is already in play") and a contact link. Never reveal which account holds it.
7. Rate-limit code attempts per IP and per e-mail to prevent enumeration.
8. A player who later buys more garments can link more codes to the same account (optional, for remembrance only, no effect on game state).

**Admin: code batches.** The admin creates a batch (count, series: `tutorial-bw` / `red` / …, note). The platform generates the codes and exports:
- a CSV (code, URL)
- a ZIP of QR code SVGs, each with the code printed under it, sized for patch printing.

Batches and codes are listed with their status (unused / activated, plus the activation date only, no player identity shown in the list).

## 5. Player profile (the game home)

### 5.1 Sections

- **Home.** Shows the level the player is currently working in, open items, and the most recent log entries. No progress bars or scores.
- **Tutorial.** Content organised by the three questions: *Why do we play? How do we play? What do we play?* Supports text, audio (podcast), video, guided self-reflections, exercises, and example challenges and quests.
- **Levels.** One page per level, with its topics and its exercises, challenges, quests, World Quests, Side Quests and Threshold Quest. Unlocked levels only, plus a list of the names and colours of all nine stages (tutorial, Levels 1 to 7, Level 8 infinity) so the player sees the whole spiral.
- **Player log.** All entries, filterable by level, topic and form.
- **Topic map.** For each unlocked level, list its topics with the number of log entries for each. Topics with zero entries are shown plainly, without warning colours. This is the "which topics have I worked with, which have I avoided" view from the outline.
- **My quests.** Player-created challenges and quests (§5.6).
- **Gratitude** (optional). A free-text daily note. Stored privately. No streaks, no reminders unless the player turns them on.
- **Settings.** E-mail, linked codes, visibility, optional private details, data export, account deletion.
- **Support.** See §8.

### 5.2 Private details

Optional fields: birth date, birth time, place of birth. Visible only to the player. Never printed, never shown to reviewers or admins in the UI, encrypted at rest (application-level encryption). Excluded from analytics and logs.

### 5.3 Working on an item

Each exercise, challenge or quest page has:
- Its metadata: topic(s), form, duration, description, completion condition, pair and circle variants if any.
- A status the player controls: *not started / in progress / postponed / complete*. Exercises have no complete state; they have "log a session".
- For quests with stages: a stage checklist the player ticks.

**Completing a challenge or quest** opens the inner referee dialog:

1. Did I do what the challenge or quest asked, in substance and not only in form?
2. Did I do it fully, rather than in a token way that avoided what was difficult?
3. Has something changed, in me or in my life, that I can name?

Each question is answered *yes / not yet*. Only three yeses allow "complete". If any answer is "not yet", the item stays open and the dialog says so neutrally ("This stays open. There is no penalty for an open challenge."). On three yeses the player writes the log entry (§5.4) and the item is marked complete.

### 5.4 Log entries

Fields: date, linked item (optional; free entries are allowed), level, topic(s), *what I did*, *what changed*, *what the inner referee said*, visibility (`private` default / `visible`). An entry can be edited afterwards; edits keep a revision history visible only to the player.

### 5.5 Level transitions

The **Tutorial → Level 1** transition is a self-declaration. The player confirms the statement: "I no longer need anyone outside myself to tell me I can move on, and I can say in integrity with myself that I am ready." The platform records it in the log and opens Level 1. No other gate.

From **Level 1 onward**, the "Move to the next level" action shows the three conditions as a checklist:
1. Every topic of the level has at least one challenge or quest in the log. The platform shows this from the topic map; it is information, not a lock.
2. The Threshold Quest is complete.
3. The inner referee confirms readiness (player tick).

Rule for condition 1: the platform displays the gaps but lets the player proceed if they tick condition 3 anyway. The referee decides. Open decision O-1 in §12 asks whether this should be a hard lock instead.

**Threshold letter (Level 1, "Yes to the Earth").** The letter is a log entry with an answer field: *yes / not yet / yes with conditions*. Only *yes* enables the transition to Level 2. The other two are valid entries and are saved as such.

On transition, the log records it and the next level's materials open. If the next level's content is not published yet, the page says "This level is in preparation" and the player keeps full access to everything before it.

### 5.6 Player-created challenges and quests

- A player can create a challenge or quest using the same structure as official content (topic, form, duration, description, stages, completion condition).
- Before it can be shared beyond *private*, the player must have marked it complete themselves (tested).
- Sharing levels: **Private**, **Circle of trust** (chosen players, pair partner, or circle; phase 2), **Public** (visible to visible players only).
- Public sharing is soft-limited to about one new public quest per month per player. Show a gentle notice and let admins adjust the value. No limit for circle-of-trust sharing.
- **Kinds:** `core` (official) and `community` (player-created). A community quest becomes eligible for review when at least *N* players (default 10, admin-configurable) from different circles have completed it and recorded in their log that something changed. Reviewers then accept or decline it. Accepted quests become core quests, crediting the original author if they agree.
- The ranking or listing of public quests must not sort by popularity alone. Default sort is by topic, then newest. Difficult themes (mortality, grief) must not be buried.
- Reviewers can group, rotate (hide temporarily) or retire core quests.

## 6. Playing together (phase 2, but model the data in phase 1)

- **Visibility setting** (phase 1): `private` (default) or `visible`. Changing to private immediately hides the player's public entries and quests and removes them from matching.
- **Pair play:** two visible players link as witnesses for a level. A witness can read the entries the other chooses to share with them and can leave the three questions as prompts. A witness can never mark anything complete.
- **Circles:** groups of 4 to 8 visible players, usually local and working the same level. A circle has a shared space for notes, meeting dates, and its World Quests.
- **Matching:** suggestions only among visible players, based on level and an optional coarse location (city or region, entered by the player, never derived from IP).
- **Recognition in the world:** documentation only. The opening question is "Which level are you playing?"

## 7. Content model

All game content is authored as Markdown/MDX files in the repo (`content/`), validated with a schema at build time, so Yannick and Diana Luz can edit through Git or a simple CMS later.

```
content/
  docs/              public documentation pages
  tutorial/          tutorial units (why / how / what)
  levels/
    00-tutorial/level.yml
    01-red/level.yml            name, colour, central theme, topics[]
    01-red/items/*.mdx          one file per exercise/challenge/quest
    02-orange/ ... 08-infinity/ level.yml only, status: in-preparation
```

**Level** fields: `number` (0 to 8), `slug`, `name`, `chakra`, `colour`, `centralTheme`, `topics[] {id, title, description}`, `status` (`published` / `in-preparation`).

**Item** frontmatter: `slug`, `title`, `level`, `topics[]` (topic ids), `form` (`exercise` | `challenge` | `quest` | `world-quest` | `threshold-quest` | `side-quest`), `duration` (free text, e.g. "3 weeks"), `stages[]` (optional), `completeWhen` (text), `pairVariant` and `circleVariant` (optional), `kind` (`core`), `sensitive` (boolean, for themes like mortality or survival fears; shows the postponement and support notice at the top). Body is the instruction text.

**Form rules from the outline** (show them on the docs page and use them for validation hints):
- Exercise: 5 to 30 minutes, repeatable, no completion state.
- Challenge: one task, 1 to 7 days, one topic, clear completion condition.
- Quest: 2 to 6 weeks, several stages, ends with a written log reflection.
- World Quest: played with other players; the result changes the shared outer world. Each level has at least one.
- Threshold Quest: the last quest of each level.
- Side Quest: optional, with a catalyst (§9); counts toward a topic, never required for a transition.

### 7.1 Seed content for v1

**Levels:** Tutorial (black and white), 1 Root (red), 2 Sacral (orange), 3 Solar plexus (yellow), 4 Heart (green), 5 Throat (blue), 6 Third eye (indigo), 7 Crown (violet), 8 Infinity. Only the Tutorial and Level 1 are `published`.

**Level 1 central theme:** inhabiting the body and the earth: being here, in this body, on this ground, and able to sustain a life.

**Level 1 topics:**
1. Inhabiting the body and the senses
2. Trust in the ground
3. Security and survival
4. Material competence
5. Holding and releasing
6. Stability and rhythm
7. Vital force and will
8. Acceptance of cycles and mortality
9. Belonging and lineage
10. Saying yes to earthly life

**Level 1 worked examples** (full texts are in the source outline, section "Level 1: Worked Examples"; convert each to an item file):

| Title | Topic(s) | Form | Duration | Variants |
|---|---|---|---|---|
| Standing Ground | 2 | exercise | 5 to 10 min | pair |
| Three Senses at the Table | 1 | challenge | 7 days | |
| The Honest Inventory | 3, 4 | challenge | 1 to 3 days | |
| The Repair | 4 | challenge | up to 7 days | circle |
| Three Anchors | 6 | quest (3 stages) | 4 weeks | |
| Keep and Release | 5 | quest (4 stages) | 3 weeks | |
| Finishing | 7 | quest | 3 weeks | |
| The Compost Cycle | 8 | quest | 4 to 6 weeks | sensitive |
| The Line and the Land | 9 | quest (3 stages) | 4 weeks | alt. stage 1 for players without access to family line |
| Common Ground | 9, 4 | world-quest | 4 to 8 weeks | |
| Yes to the Earth | 10 | threshold-quest | 1 day + preparation | threshold letter |

Additional source material is in the Drive doc "The Red Level – 111 Root Challenges". Do not import it in v1 unless the authors supply it; leave the structure ready for it.

**Tutorial:** create the three sections (why / how / what) with the outline's sections *Introduction*, *Why We Play*, *The premise of the game*, *The Symbols of Recognition*, *Mechanics* and *The inner referee* as the first texts. Leave slots for audio and video embeds.

## 8. Support and safety

- A **Support** page and a "This touches something I can't carry alone" button on every item page. The button opens a form that sends a message to the support contacts (stored in the platform plus an e-mail notification). The player can choose to include a link to the item.
- Fixed notice on the support page and in the form: support contacts are fellow players, not therapists or crisis services. In an acute emergency, contact local emergency services (112 in the EU) or a crisis line. Keep a short list of crisis lines per country in a content file the admins maintain.
- Items marked `sensitive` show at the top that the player may postpone them for as long as they need.
- No automated content analysis of log entries. Log entries are never read by staff.

## 9. Side Quests and catalysts (phase 2)

A directory of catalysts (therapists, healers, carers, guides, teachers, craftspeople) with their offers. Each offer is linked to a level and a topic. Listing conditions, enforced by the admin approval form:
- The catalyst can show training or experience in what they offer.
- The listing makes no promise of healing.
- Offers that touch physical or mental health are listed only from qualified practitioners (the admin records the qualification).

## 10. Sacred Sundays (phase 1: docs; phase 2: events)

- Phase 1: a documentation page with the purpose and the suggested flow: arrival and gratitude, silence, group meditation, grief, movement/song/dance, care, closing. Include the note that hosts may shorten, reorder or extend it, that gatherings including grief work are held by an experienced player, and that the flow is shared with participants in advance.
- Phase 2: hosts (approved players) can publish gatherings (date, place type: home / venue / nature, area, capacity, flow). Visible players can register. Exact addresses go only to registered participants.

## 11. Shop

### 11.1 Products
- **Tutorial series (black and white):** T-shirt (lower-cost option) and sweatshirt. This is the entry product.
- **Level series (one colour series per level):** optional. Only the red series exists for v1, and only if the artwork is ready; otherwise show "coming".
- Variants: size, possibly cut. Prices, sizes and print method are set by the admins.
- The product pages explain plainly: the first black-and-white piece is the entry to the game; everything after is free; later pieces are optional and do not move anyone forward in the game.

### 11.2 Implementation
- **Stripe Checkout** for payment (cards, SEPA, MB Way/Multibanco if enabled in the Stripe account, since the operators are based in Portugal and Germany). No card data touches the platform.
- Orders stored in the platform: items, shipping address, status (`paid / in production / shipped / delivered / refunded`), tracking number. Admin order list with CSV export for the person who prints and ships.
- Fulfilment is manual in v1: the patches come from pre-generated code batches (§4). The order does not need to know which code goes on which garment. Optionally the admin can record the code when packing, for support cases.
- A shop purchase never creates a player account and never changes game state. A buyer who wants to play activates the code on the patch like everyone else.
- Shipping regions: start with the EU. VAT handling via Stripe Tax or a fixed setting; flag this as an open decision for the operators' accountant (O-5).
- Order confirmation and shipping e-mails.

### 11.3 Later
Print-on-demand integration only if the patch with a unique code can be handled by the provider. Otherwise keep manual production.

## 12. Open decisions for the authors

Do not resolve these yourself. Implement the default and make it configurable.

- **O-1** Level transition condition 1 (every topic in the log): information only (default) or a hard lock?
- **O-2** A low-cost entry option (a patch or card instead of a garment) for players who cannot afford clothing? Default: support a product type `patch` in the data model, not listed.
- **O-3** Languages. Default: English UI and content, with i18n set up from the start (`en`, then `de`, `es`, `pt`).
- **O-4** When to open pair and circle matching. Default: phase 2.
- **O-5** VAT and invoicing setup, legal entity, business address for the imprint.
- **O-6** Domain name and the final title of the game (candidates in the outline: The Consciousness Development Game, The Game of Inner Growth, The Game of Unfolding Potential, The Infinite Game, The Game of the Divine Creator).
- **O-7** Whether reviewers see a player's identity when reviewing a community quest, or review it anonymously. Default: anonymous, author shown after acceptance if the author agrees.

## 13. Visual design

- Base: black and white, taken from the tutorial series. Each level page and its shop series uses its chakra colour as the accent: red, orange, yellow, green, blue, indigo, violet; Level 8 uses all of them or white.
- The drawings are Diana Luz's original artwork, supplied by the authors as image files in `public/art/`. Do not generate or imitate artwork; use neutral placeholders until the files are delivered.
- Typography: calm, readable, generous spacing; long-form reading comfortable on mobile. Most players will arrive by scanning a QR code on a phone, so build mobile-first.
- Accessibility: WCAG 2.1 AA (contrast, keyboard navigation, alt text, captions for video, transcripts for audio).
- Tone of UI text: plain, direct, no gamified hype ("Level up!", "Great job!"). Neutral confirmations.

## 14. Technical baseline (proposal; adjust if there is a reason)

- **Framework:** Next.js (App Router) + TypeScript.
- **Database:** PostgreSQL with Prisma.
- **Auth:** e-mail magic links (Auth.js or equivalent). Sessions in HTTP-only cookies.
- **E-mail:** a transactional provider with EU data residency (e.g. Postmark or Brevo); keep it behind an interface.
- **Payments:** Stripe Checkout + webhooks.
- **Content:** MDX in the repo with schema validation (e.g. Contentlayer successor or `zod` on frontmatter).
- **Hosting:** EU region for database and server (GDPR). Vercel with an EU database, or a single VPS with Docker. Ask the authors before committing to a paid service.
- **Encryption:** application-level encryption for private details (§5.2).
- **Analytics:** none in v1, or a cookieless privacy-first tool on public pages only. No analytics inside the player profile.

### Data model (minimum)

- `User` (id, email, createdAt, visibility, currentLevel, roles[])
- `PlayerCode` (code, batchId, series, activatedAt, userId?)
- `CodeBatch` (id, series, count, note, createdAt)
- `PrivateDetails` (userId, birthDate*, birthTime*, birthPlace*; * encrypted)
- `ItemProgress` (userId, itemRef, status, stagesDone[], postponedAt?, completedAt?)
- `LogEntry` (id, userId, itemRef?, level, topicIds[], did, changed, refereeSaid, thresholdAnswer?, visibility, createdAt, revisions[])
- `LevelTransition` (userId, fromLevel, toLevel, at, conditionsSnapshot)
- `PlayerQuest` (id, authorId, fields as Item, sharing, kind, testedAt, reviewStatus)
- `QuestCompletion` (questId, userId, circleId?, changedConfirmed)
- `GratitudeNote` (userId, date, text)
- `SupportRequest` (id, userId, itemRef?, message, status, createdAt)
- `Product`, `Variant`, `Order`, `OrderItem`
- Phase 2: `Pair`, `Circle`, `CircleMember`, `Catalyst`, `CatalystOffer`, `Gathering`, `Registration`

## 15. Legal and privacy pages

- Imprint (Impressum) and privacy policy: create the pages with placeholder text and a visible TODO; the authors supply the final texts (O-5).
- Terms for the shop (withdrawal right for EU consumers, shipping, returns).
- Settings → export all my data (JSON + readable HTML) and delete my account (deletes log, quests, details; the player code is marked as retired, not re-issued).
- Cookie banner only if non-essential cookies are used. Aim for none.
- Disclaimer on docs and support pages: the game is not therapy, not medical advice, and makes no healing promises.

## 16. Build phases

**Phase 1 (this build):**
1. Project setup, auth, database, i18n scaffolding, design tokens.
2. Public docs pages from `content/docs` and the tutorial content.
3. Code batches (admin) and code activation flow (§4).
4. Player profile: tutorial, Level 1, item pages, status, inner referee dialog, log, topic map, transitions, threshold letter, gratitude, settings, visibility, data export and deletion.
5. Player-created quests: create, test, private and public sharing (public visible to visible players only). Review queue for reviewers.
6. Support flow.
7. Shop with Stripe Checkout, orders, admin order list, e-mails.
8. Seed content from §7.1.

**Phase 2:** pair play, circles and matching, circle-of-trust sharing, community quest promotion thresholds, Sacred Sunday events, catalyst directory and Side Quests, additional languages.

**Phase 3:** Levels 2 to 8 content as the authors write it; additional colour series in the shop.

## 17. Acceptance criteria for phase 1

- A new visitor can scan a test QR code on a phone, enter an e-mail, click the link, and land in the tutorial in under two minutes.
- An already-activated code cannot be activated again and the response reveals nothing about its owner.
- Buying a garment in the shop (Stripe test mode) creates an order and changes nothing in any player account.
- A challenge cannot be marked complete unless all three referee questions are answered *yes*. "Not yet" leaves it open without any negative message.
- No points, badges, streaks, percentages or leaderboards appear anywhere.
- A private player sees no other player's content. A visible player sees public entries and quests only from other visible players. Switching to private hides the player's own public content immediately.
- Private details are encrypted in the database and absent from admin views, logs and exports other than the player's own.
- Returning to the tutorial or Level 1 after moving on works and is labelled neutrally.
- Level 2 to 8 pages show "in preparation" and do not break the transition flow.
- The threshold letter with "not yet" or "yes with conditions" is saved and does not enable the transition; "yes" does.
- Lighthouse accessibility score ≥ 95 on the main pages; the full player flow works by keyboard alone.
- Data export and account deletion work end to end.

## 18. Working instructions for Claude Code

- Read `docs/source/game-outline.md` before writing any game text. Use the authors' wording for game content; do not invent new rules, quests or spiritual claims.
- Where this spec and the outline differ, the outline wins for game rules and this spec wins for software behaviour. List any conflict you find in `docs/DECISIONS.md` instead of resolving it silently.
- Record every assumption you make in `docs/DECISIONS.md`.
- Ask before choosing paid services, the domain, or anything in §12.
- Write tests for: code activation, the referee dialog, visibility rules, level transitions, and the Stripe webhook.
