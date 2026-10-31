import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const DIR = "./.pgdata-test";
const PORT = 5434;
const URL = `postgresql://postgres:postgres@localhost:${PORT}/game_test`;

let pg: EmbeddedPostgres;

export async function setup() {
  rmSync(DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({ databaseDir: DIR, user: "postgres", password: "postgres", port: PORT, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("game_test");
  execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: URL }, stdio: "ignore" });
}

export async function teardown() {
  await pg?.stop();
}
