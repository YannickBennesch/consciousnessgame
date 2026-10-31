# The Consciousness Development Game: platform

Phase 1 of the platform described in [PLATFORM_SPEC.md](PLATFORM_SPEC.md): the game home (player profile), the shop for the symbols of recognition, and the public documentation.

- Game rules and wording: [docs/source/game-outline.md](docs/source/game-outline.md) (export of the Google Doc).
- Every assumption, conflict and open decision: [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it locally

Requires Node.js 22+. No Docker needed.

```bash
npm install
cp .env.example .env        # then fill ENCRYPTION_KEY and AUTH_SECRET (see comments)
npm run db:start            # embedded Postgres on :5433, keep it running
npx prisma db push          # in a second terminal
npm run db:seed             # shop products + 5 test player codes (printed)
npm run dev                 # http://localhost:3000
```

Open `http://localhost:3000/play?code=<one of the printed codes>`, enter an e-mail address, then open the link that appears in `.mail-outbox/`. Addresses listed in `BOOTSTRAP_ADMINS` get the admin, reviewer and support roles.

## Tests

```bash
npm test
```

The tests start their own embedded Postgres on :5434. They cover code activation, the referee dialog, visibility rules, level transitions, the Stripe webhook, data export and deletion, and content loading.

## Where things are

| Path | What |
|---|---|
| `content/levels/*/level.yml` | Levels: name, colour, central theme, topics, status |
| `content/levels/01-red/items/*.mdx` | Exercises, challenges and quests (frontmatter + instructions) |
| `content/docs`, `content/tutorial` | Public docs and tutorial units; text is pulled from the outline by heading |
| `content/legal`, `content/support/crisis-lines.yml` | Legal placeholders; crisis lines (admins maintain) |
| `src/lib/` | All rules: `game.ts` (referee, log, transitions), `visibility.ts`, `quests.ts`, `activation.ts`, `codes.ts`, `shop.ts`, `account.ts` |
| `src/app/` | Pages: public, `/profile/*` (player), `/admin/*` (admin, reviewer, support) |
| `prisma/schema.prisma` | Data model, including phase-2 tables |

`npm run content:check` validates all content against the schemas. It runs before every build.
