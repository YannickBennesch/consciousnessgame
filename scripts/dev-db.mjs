// Runs a local PostgreSQL without Docker, for development only.
// Usage: npm run db:start   (keep it running in its own terminal)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dir = process.argv[2] ?? "./.pgdata";
const port = Number(process.argv[3] ?? 5433);
const db = process.argv[4] ?? "game";

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  onLog: () => {},
});

const fresh = !existsSync(dir);
if (fresh) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase(db);
} catch {
  // already exists
}
console.log(`Postgres ready: postgresql://postgres:postgres@localhost:${port}/${db}`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
