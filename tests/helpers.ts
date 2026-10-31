import { db } from "@/lib/db";
import { setEmailProvider, type Mail } from "@/lib/email";

export const outbox: Mail[] = [];
setEmailProvider({ send: async (m) => void outbox.push(m) });

export async function resetDb() {
  outbox.length = 0;
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

let n = 0;
export async function makeUser(opts: { visibility?: "PRIVATE" | "VISIBLE"; currentLevel?: number } = {}) {
  n++;
  return db.user.create({
    data: { email: `p${n}-${Date.now()}@example.test`, visibility: opts.visibility ?? "PRIVATE", currentLevel: opts.currentLevel ?? 0 },
  });
}

export const YES = ["yes", "yes", "yes"] as const;
export const ENTRY = { did: "I did it.", changed: "Something changed.", refereeSaid: "Yes." };

/** Token from the last mail containing a verify link. */
export function lastToken(): string {
  const mail = outbox.at(-1);
  const m = mail?.text.match(/token=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("no token in outbox");
  return m[1];
}
