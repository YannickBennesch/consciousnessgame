import type { PlayerQuest } from "@prisma/client";
import { db } from "./db";

/**
 * Visibility is reciprocal (§2): only visible players see other visible players' content.
 * Author visibility is checked at query time, so switching to private hides everything at once.
 */
export async function isVisible(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { visibility: true } });
  return u?.visibility === "VISIBLE";
}

export async function publicEntriesFor(viewerId: string, opts: { level?: number; take?: number } = {}) {
  if (!(await isVisible(viewerId))) return [];
  return db.logEntry.findMany({
    where: {
      visibility: "VISIBLE",
      userId: { not: viewerId },
      user: { visibility: "VISIBLE" },
      kind: { in: ["ENTRY", "EXERCISE_SESSION", "THRESHOLD_LETTER"] },
      level: opts.level,
    },
    // Only the fields meant to be shared: no e-mail, no account data.
    select: {
      id: true,
      date: true,
      level: true,
      topicIds: true,
      itemTitle: true,
      form: true,
      did: true,
      changed: true,
      refereeSaid: true,
      thresholdAnswer: true,
    },
    orderBy: { date: "desc" },
    take: opts.take ?? 50,
  });
}

/** Default sort: by level and topic, then newest. Never by popularity (§5.6). */
export async function publicQuestsFor(viewerId: string, opts: { level?: number } = {}) {
  if (!(await isVisible(viewerId))) return [];
  const quests = await db.playerQuest.findMany({
    where: {
      sharing: "PUBLIC",
      kind: "COMMUNITY",
      testedAt: { not: null },
      authorId: { not: viewerId },
      author: { visibility: "VISIBLE" },
      level: opts.level,
    },
    orderBy: { createdAt: "desc" },
  });
  return quests
    .map(stripAuthor)
    .sort((a, b) => a.level - b.level || (a.topicIds[0] ?? "").localeCompare(b.topicIds[0] ?? "") || +b.createdAt - +a.createdAt);
}

/** Can this viewer open this player quest? */
export async function canViewQuest(viewerId: string, quest: PlayerQuest): Promise<boolean> {
  if (quest.authorId === viewerId) return true;
  if (quest.kind === "CORE") return quest.coreState === "ACTIVE";
  if (quest.sharing !== "PUBLIC" || !quest.testedAt || !quest.authorId) return false;
  const [viewerVisible, authorVisible] = await Promise.all([isVisible(viewerId), isVisible(quest.authorId)]);
  return viewerVisible && authorVisible;
}

/** Community quests are shown without author identity (O-7: anonymous by default). */
export function stripAuthor<T extends PlayerQuest>(q: T): Omit<T, "authorId"> & { authorId: null } {
  return { ...q, authorId: null };
}
