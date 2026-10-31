import type { CoreState, Sharing } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { FORMS, getLevel } from "./content";
import { getSetting } from "./settings";

export const QuestInput = z.object({
  title: z.string().trim().min(2).max(140),
  level: z.coerce.number().int().min(0).max(8),
  topicIds: z.array(z.string()).min(1),
  // Threshold Quests belong to the core content only.
  form: z.enum(FORMS).refine((f) => f !== "threshold-quest", "Threshold Quests are part of the core content"),
  duration: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(8000),
  stages: z.array(z.string().trim().min(1).max(1000)).max(12).default([]),
  completeWhen: z.string().trim().min(3).max(1000),
  sensitive: z.boolean().default(false),
  creditAuthor: z.boolean().default(false),
});
export type QuestInput = z.infer<typeof QuestInput>;

/** Keeps only topics of the chosen level (the form lists the topics of every open level). */
function checkTopics(input: QuestInput): QuestInput {
  const ids = new Set(getLevel(input.level)?.topics.map((t) => t.id));
  const topicIds = input.topicIds.filter((t) => ids.has(t));
  if (topicIds.length === 0) throw new Error("Choose at least one topic of this level");
  return { ...input, topicIds };
}

export async function createQuest(authorId: string, raw: unknown) {
  const input = checkTopics(QuestInput.parse(raw));
  return db.playerQuest.create({ data: { ...input, authorId, kind: "COMMUNITY" } });
}

export async function updateQuest(authorId: string, questId: string, raw: unknown) {
  const input = checkTopics(QuestInput.parse(raw));
  const q = await db.playerQuest.findFirst({ where: { id: questId, authorId, kind: "COMMUNITY" } });
  if (!q) throw new Error("Not found");
  return db.playerQuest.update({ where: { id: questId }, data: input });
}

export type SharingResult =
  | { ok: true }
  | { ok: false; reason: "not-tested" | "phase-2" | "soft-limit"; limit?: number };

/**
 * Sharing beyond private requires that the author has completed the quest (tested it).
 * Public sharing is soft-limited: past the limit the player sees a gentle notice and can still share.
 */
export async function setSharing(
  authorId: string,
  questId: string,
  sharing: Sharing,
  opts: { acknowledgedLimit?: boolean } = {},
): Promise<SharingResult> {
  const q = await db.playerQuest.findFirst({ where: { id: questId, authorId, kind: "COMMUNITY" } });
  if (!q) throw new Error("Not found");
  if (sharing === "CIRCLE") return { ok: false, reason: "phase-2" };
  if (sharing !== "PRIVATE" && !q.testedAt) return { ok: false, reason: "not-tested" };
  if (sharing === "PUBLIC" && q.sharing !== "PUBLIC") {
    const limit = await getSetting("publicQuestsPerMonth");
    const recent = await db.playerQuest.count({
      where: { authorId, sharedPublicAt: { gte: new Date(Date.now() - 30 * 86400_000) }, id: { not: questId } },
    });
    if (recent >= limit && !opts.acknowledgedLimit) return { ok: false, reason: "soft-limit", limit };
  }
  await db.playerQuest.update({
    where: { id: questId },
    data: { sharing, sharedPublicAt: sharing === "PUBLIC" ? (q.sharedPublicAt ?? new Date()) : q.sharedPublicAt },
  });
  return { ok: true };
}

/**
 * Completions "from different circles" (§5.6). Players in the same circle count once;
 * players without a circle count individually (circles arrive in phase 2).
 */
export async function distinctCircleCompletions(questId: string): Promise<number> {
  const rows = await db.questCompletion.findMany({
    where: { questId, changedConfirmed: true },
    select: { userId: true, circleId: true },
  });
  return new Set(rows.map((r) => r.circleId ?? `solo:${r.userId}`)).size;
}

/** Marks quests ELIGIBLE once they pass the threshold. Run after completions and on the review page. */
export async function refreshEligibility() {
  const threshold = await getSetting("reviewThreshold");
  const candidates = await db.playerQuest.findMany({
    where: { kind: "COMMUNITY", sharing: "PUBLIC", reviewStatus: "NONE", testedAt: { not: null } },
    select: { id: true },
  });
  for (const { id } of candidates) {
    if ((await distinctCircleCompletions(id)) >= threshold) {
      await db.playerQuest.update({ where: { id }, data: { reviewStatus: "ELIGIBLE" } });
    }
  }
}

/** Review queue, without author identity (O-7). */
export async function reviewQueue() {
  await refreshEligibility();
  const quests = await db.playerQuest.findMany({ where: { reviewStatus: "ELIGIBLE" }, orderBy: { createdAt: "asc" } });
  return Promise.all(
    quests.map(async ({ authorId: _authorId, ...q }) => ({ ...q, completions: await distinctCircleCompletions(q.id) })),
  );
}

export async function review(questId: string, decision: "accept" | "decline") {
  const q = await db.playerQuest.findUniqueOrThrow({ where: { id: questId } });
  if (q.reviewStatus !== "ELIGIBLE") throw new Error("Not in the review queue");
  return db.playerQuest.update({
    where: { id: questId },
    data:
      decision === "accept"
        ? { reviewStatus: "ACCEPTED", kind: "CORE", reviewedAt: new Date(), coreState: "ACTIVE" }
        : { reviewStatus: "DECLINED", reviewedAt: new Date() },
  });
}

/** Reviewers can group, rotate (hide temporarily) or retire core quests. */
export async function setCoreState(questId: string, state: CoreState, group?: string | null) {
  return db.playerQuest.update({
    where: { id: questId, kind: "CORE" },
    data: { coreState: state, coreGroup: group === undefined ? undefined : group || null },
  });
}

/** Accepted community quests that now appear next to the core content of a level. */
export function promotedCoreQuests(level: number) {
  return db.playerQuest.findMany({
    where: { kind: "CORE", coreState: "ACTIVE", level },
    orderBy: [{ coreGroup: "asc" }, { title: "asc" }],
  });
}
