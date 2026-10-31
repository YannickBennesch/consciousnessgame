import { db } from "./db";
import { decryptOptional, encryptOptional } from "./crypto";
import { formatCode } from "./codes";

export async function getPrivateDetails(userId: string) {
  const row = await db.privateDetails.findUnique({ where: { userId } });
  return {
    birthDate: decryptOptional(row?.birthDate),
    birthTime: decryptOptional(row?.birthTime),
    birthPlace: decryptOptional(row?.birthPlace),
  };
}

export async function savePrivateDetails(
  userId: string,
  input: { birthDate?: string | null; birthTime?: string | null; birthPlace?: string | null },
) {
  const data = {
    birthDate: encryptOptional(input.birthDate?.trim()),
    birthTime: encryptOptional(input.birthTime?.trim()),
    birthPlace: encryptOptional(input.birthPlace?.trim()),
  };
  await db.privateDetails.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

/** Everything we hold about the player, for "export all my data". */
export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      codes: { select: { code: true, series: true, activatedAt: true } },
      progress: true,
      logEntries: { include: { revisions: true }, orderBy: { date: "asc" } },
      transitions: true,
      quests: { include: { completions: { select: { createdAt: true } } } },
      completions: true,
      gratitude: { orderBy: { date: "asc" } },
      supportRequests: true,
    },
  });
  const { codes, ...rest } = user;
  return {
    exportedAt: new Date().toISOString(),
    account: {
      email: rest.email,
      createdAt: rest.createdAt,
      visibility: rest.visibility,
      currentLevel: rest.currentLevel,
      focusLevel: rest.focusLevel,
      region: rest.region,
      locale: rest.locale,
    },
    privateDetails: await getPrivateDetails(userId),
    codes: codes.map((c) => ({ ...c, code: formatCode(c.code) })),
    itemProgress: rest.progress,
    log: rest.logEntries,
    levelTransitions: rest.transitions,
    myQuests: rest.quests,
    questCompletions: rest.completions,
    gratitude: rest.gratitude,
    supportRequests: rest.supportRequests,
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function exportAsHtml(data: Awaited<ReturnType<typeof exportUserData>>): string {
  const section = (title: string, body: string) => `<h2>${escapeHtml(title)}</h2>${body}`;
  const log = data.log
    .map(
      (e) => `<article><h3>${escapeHtml(e.date.toISOString().slice(0, 10))} · ${escapeHtml(e.itemTitle ?? "Free entry")}</h3>
<p><strong>What I did:</strong> ${escapeHtml(e.did)}</p>
<p><strong>What changed:</strong> ${escapeHtml(e.changed)}</p>
<p><strong>What the inner referee said:</strong> ${escapeHtml(e.refereeSaid)}</p>
${e.thresholdAnswer ? `<p><strong>Answer:</strong> ${escapeHtml(e.thresholdAnswer)}</p>` : ""}</article>`,
    )
    .join("\n");
  const gratitude = data.gratitude
    .map((g) => `<li>${escapeHtml(g.date.toISOString().slice(0, 10))}: ${escapeHtml(g.text)}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>My game data</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.6}</style></head><body>
<h1>My game data</h1><p>Exported ${escapeHtml(data.exportedAt)}</p>
${section("Account", `<pre>${escapeHtml(JSON.stringify(data.account, null, 2))}</pre>`)}
${section("Private details", `<pre>${escapeHtml(JSON.stringify(data.privateDetails, null, 2))}</pre>`)}
${section("Player codes", `<ul>${data.codes.map((c) => `<li>${escapeHtml(c.code)}</li>`).join("")}</ul>`)}
${section("Player log", log || "<p>No entries.</p>")}
${section("Gratitude", gratitude ? `<ul>${gratitude}</ul>` : "<p>No notes.</p>")}
${section("My quests", `<pre>${escapeHtml(JSON.stringify(data.myQuests, null, 2))}</pre>`)}
</body></html>`;
}

/**
 * Deletes log, quests, details, support requests and the account. Player codes are retired, never re-issued.
 * Quests already accepted into the core content stay in the game without an author.
 */
export async function deleteAccount(userId: string) {
  await db.$transaction([
    db.playerCode.updateMany({ where: { userId }, data: { status: "RETIRED", userId: null } }),
    db.playerQuest.updateMany({ where: { authorId: userId, kind: "CORE" }, data: { authorId: null, creditAuthor: false } }),
    db.playerQuest.deleteMany({ where: { authorId: userId, kind: "COMMUNITY" } }),
    db.supportRequest.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
}
