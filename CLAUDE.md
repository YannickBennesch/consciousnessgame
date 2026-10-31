# Working on this repo

- The build brief is [PLATFORM_SPEC.md](PLATFORM_SPEC.md). Follow its §2 design principles without exception: the inner referee is the only authority, no external rewards, private by default, reciprocal visibility, the spiral rather than a ladder.
- Read [docs/source/game-outline.md](docs/source/game-outline.md) before writing any game text. Use the authors' wording; never invent rules, quests or spiritual claims.
- Record every assumption or spec/outline conflict in [docs/DECISIONS.md](docs/DECISIONS.md). Ask before choosing paid services, the domain, or anything in spec §12.
- Game rules live in `src/lib/` and are covered by `npm test` (embedded Postgres, no Docker). Keep pages thin.
- UI text is plain and neutral: no "Level up!", no "Great job!", no warning colours for open or avoided items.
