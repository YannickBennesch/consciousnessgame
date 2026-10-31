import type { EntryVisibility, ItemStatus, LogEntry, ThresholdAnswer } from "@prisma/client";
import { db } from "./db";
import { getItemByRef, getLevel, thresholdItem, type Form } from "./content";
import { getSetting } from "./settings";

// ---------- Items (core content or player-created) ----------

export interface ResolvedItem {
  ref: string;
  title: string;
  level: number;
  topicIds: string[];
  form: Form;
  duration: string;
  description: string;
  stages: string[];
  completeWhen?: string;
  pairVariant?: string;
  circleVariant?: string;
  sensitive: boolean;
  thresholdLetter: boolean;
  playerQuestId?: string;
  authorId?: string | null;
}

export async function resolveItem(ref: string): Promise<ResolvedItem | null> {
  if (ref.startsWith("core:")) {
    const it = getItemByRef(ref);
    if (!it) return null;
    return {
      ref,
      title: it.title,
      level: it.level,
      topicIds: it.topics,
      form: it.form,
      duration: it.duration,
      description: it.body,
      stages: it.stages ?? [],
      completeWhen: it.completeWhen,
      pairVariant: it.pairVariant,
      circleVariant: it.circleVariant,
      sensitive: it.sensitive,
      thresholdLetter: it.thresholdLetter,
    };
  }
  if (ref.startsWith("player:")) {
    const q = await db.playerQuest.findUnique({ where: { id: ref.slice(7) } });
    if (!q) return null;
    return {
      ref,
      title: q.title,
      level: q.level,
      topicIds: q.topicIds,
      form: q.form as Form,
      duration: q.duration,
      description: q.description,
      stages: q.stages,
      completeWhen: q.completeWhen,
      sensitive: q.sensitive,
      thresholdLetter: false,
      playerQuestId: q.id,
      authorId: q.authorId,
    };
  }
  return null;
}

export const isCompletable = (form: Form) => form !== "exercise";

// ---------- The inner referee (§5.3) ----------

export type RefereeAnswer = "yes" | "not-yet";
export type RefereeAnswers = [RefereeAnswer, RefereeAnswer, RefereeAnswer];

export const REFEREE_QUESTIONS = [
  "Did I do what the challenge or quest asked, in substance and not only in form?",
  "Did I do it fully, rather than in a token way that avoided what was difficult?",
  "Has something changed, in me or in my life, that I can name?",
] as const;

export const OPEN_MESSAGE = "This stays open. There is no penalty for an open challenge.";

/** Only three yeses allow "complete". The platform never decides anything else. */
export function refereeVerdict(answers: readonly string[]): "complete" | "open" {
  return answers.length === 3 && answers.every((a) => a === "yes") ? "complete" : "open";
}

// ---------- Item status ----------

export async function getProgress(userId: string, itemRef: string) {
  return db.itemProgress.findUnique({ where: { userId_itemRef: { userId, itemRef } } });
}

/** Player-controlled status changes. "Complete" only goes through the referee dialog. */
export async function setStatus(userId: string, itemRef: string, status: Exclude<ItemStatus, "COMPLETE">) {
  const item = await resolveItem(itemRef);
  if (!item) throw new Error("Unknown item");
  return db.itemProgress.upsert({
    where: { userId_itemRef: { userId, itemRef } },
    create: { userId, itemRef, status, postponedAt: status === "POSTPONED" ? new Date() : null },
    update: { status, postponedAt: status === "POSTPONED" ? new Date() : null, completedAt: null },
  });
}

export async function toggleStage(userId: string, itemRef: string, stage: number) {
  const item = await resolveItem(itemRef);
  if (!item || stage < 0 || stage >= item.stages.length) throw new Error("Unknown stage");
  const current = await getProgress(userId, itemRef);
  const done = new Set(current?.stagesDone ?? []);
  if (done.has(stage)) done.delete(stage);
  else done.add(stage);
  const stagesDone = [...done].sort((a, b) => a - b);
  return db.itemProgress.upsert({
    where: { userId_itemRef: { userId, itemRef } },
    create: { userId, itemRef, status: "IN_PROGRESS", stagesDone },
    update: { stagesDone, status: current?.status === "NOT_STARTED" ? "IN_PROGRESS" : undefined },
  });
}

export interface EntryInput {
  did: string;
  changed: string;
  refereeSaid: string;
  visibility?: EntryVisibility;
  date?: Date;
  topicIds?: string[];
}

export type CompleteResult =
  | { verdict: "complete"; entry: LogEntry }
  | { verdict: "open"; message: typeof OPEN_MESSAGE };

/**
 * The inner referee dialog. Three yeses + a log entry mark the item complete.
 * Any "not yet" leaves the item exactly as it was.
 */
export async function completeItem(
  userId: string,
  itemRef: string,
  answers: readonly string[],
  entry: EntryInput,
): Promise<CompleteResult> {
  const item = await resolveItem(itemRef);
  if (!item) throw new Error("Unknown item");
  if (!isCompletable(item.form)) throw new Error("Exercises have no complete state; log a session instead");
  if (refereeVerdict(answers) === "open") return { verdict: "open", message: OPEN_MESSAGE };

  return db.$transaction(async (tx) => {
    const created = await tx.logEntry.create({
      data: {
        userId,
        kind: "ENTRY",
        itemRef,
        itemTitle: item.title,
        form: item.form,
        level: item.level,
        topicIds: item.topicIds,
        did: entry.did,
        changed: entry.changed,
        refereeSaid: entry.refereeSaid,
        visibility: entry.visibility ?? "PRIVATE",
        date: entry.date ?? new Date(),
      },
    });
    await tx.itemProgress.upsert({
      where: { userId_itemRef: { userId, itemRef } },
      create: { userId, itemRef, status: "COMPLETE", completedAt: new Date() },
      update: { status: "COMPLETE", completedAt: new Date(), postponedAt: null },
    });
    if (item.playerQuestId) {
      if (item.authorId === userId) {
        // The author's own completion is the test that allows sharing (§5.6).
        await tx.playerQuest.updateMany({ where: { id: item.playerQuestId, testedAt: null }, data: { testedAt: new Date() } });
      } else {
        await tx.questCompletion.upsert({
          where: { questId_userId: { questId: item.playerQuestId, userId } },
          create: { questId: item.playerQuestId, userId, changedConfirmed: true },
          update: { changedConfirmed: true },
        });
      }
    }
    return { verdict: "complete" as const, entry: created };
  });
}

/** Exercises: "log a session" instead of complete. */
export async function logExerciseSession(userId: string, itemRef: string, entry: EntryInput) {
  const item = await resolveItem(itemRef);
  if (!item || item.form !== "exercise") throw new Error("Not an exercise");
  await db.itemProgress.upsert({
    where: { userId_itemRef: { userId, itemRef } },
    create: { userId, itemRef, status: "IN_PROGRESS" },
    update: {},
  });
  return db.logEntry.create({
    data: {
      userId,
      kind: "EXERCISE_SESSION",
      itemRef,
      itemTitle: item.title,
      form: item.form,
      level: item.level,
      topicIds: item.topicIds,
      did: entry.did,
      changed: entry.changed,
      refereeSaid: entry.refereeSaid,
      visibility: entry.visibility ?? "PRIVATE",
      date: entry.date ?? new Date(),
    },
  });
}

/** Threshold letter (§5.5): a log entry with an answer. Every answer is valid and saved. */
export async function writeThresholdLetter(
  userId: string,
  itemRef: string,
  answer: ThresholdAnswer,
  letter: string,
  visibility: EntryVisibility = "PRIVATE",
) {
  const item = await resolveItem(itemRef);
  if (!item?.thresholdLetter) throw new Error("This item has no threshold letter");
  return db.logEntry.create({
    data: {
      userId,
      kind: "THRESHOLD_LETTER",
      itemRef,
      itemTitle: item.title,
      form: item.form,
      level: item.level,
      topicIds: item.topicIds,
      did: letter,
      thresholdAnswer: answer,
      visibility,
    },
  });
}

// ---------- Log entries ----------

export async function createFreeEntry(userId: string, level: number, input: EntryInput) {
  return db.logEntry.create({
    data: {
      userId,
      level,
      topicIds: input.topicIds ?? [],
      did: input.did,
      changed: input.changed,
      refereeSaid: input.refereeSaid,
      visibility: input.visibility ?? "PRIVATE",
      date: input.date ?? new Date(),
    },
  });
}

/** Edits keep a revision history visible only to the player. */
export async function updateEntry(userId: string, entryId: string, input: Partial<EntryInput>) {
  const existing = await db.logEntry.findFirst({ where: { id: entryId, userId } });
  if (!existing) throw new Error("Not found");
  if (existing.kind === "TRANSITION") throw new Error("Transition records are not edited");
  return db.$transaction(async (tx) => {
    await tx.logRevision.create({
      data: {
        entryId,
        snapshot: {
          date: existing.date.toISOString(),
          topicIds: existing.topicIds,
          did: existing.did,
          changed: existing.changed,
          refereeSaid: existing.refereeSaid,
          visibility: existing.visibility,
        },
      },
    });
    return tx.logEntry.update({
      where: { id: entryId },
      data: {
        did: input.did,
        changed: input.changed,
        refereeSaid: input.refereeSaid,
        visibility: input.visibility,
        date: input.date,
        topicIds: input.topicIds,
      },
    });
  });
}

// ---------- Topic map (§5.1) ----------

const COUNTS_FOR_TRANSITION: Form[] = ["challenge", "quest", "world-quest", "threshold-quest", "side-quest"];

export async function topicMap(userId: string, level: number) {
  const lvl = getLevel(level);
  if (!lvl) return [];
  const entries = await db.logEntry.findMany({
    where: { userId, level, kind: { in: ["ENTRY", "EXERCISE_SESSION", "THRESHOLD_LETTER"] } },
    select: { topicIds: true, form: true, kind: true },
  });
  return lvl.topics.map((t) => {
    const mine = entries.filter((e) => e.topicIds.includes(t.id));
    return {
      topic: t,
      entries: mine.length,
      challengeOrQuest: mine.filter((e) => e.kind === "ENTRY" && e.form && COUNTS_FOR_TRANSITION.includes(e.form as Form))
        .length,
    };
  });
}

// ---------- Level transitions (§5.5) ----------

export const TUTORIAL_STATEMENT =
  "I no longer need anyone outside myself to tell me I can move on, and I can say in integrity with myself that I am ready.";

export async function transitionConditions(userId: string, level: number) {
  if (level === 0) return { level, kind: "tutorial" as const };
  const map = await topicMap(userId, level);
  const gaps = map.filter((m) => m.challengeOrQuest === 0).map((m) => m.topic);
  const threshold = thresholdItem(level);
  const thresholdDone = threshold ? (await getProgress(userId, threshold.ref))?.status === "COMPLETE" : false;
  let letter: ThresholdAnswer | null = null;
  if (threshold?.thresholdLetter) {
    const last = await db.logEntry.findFirst({
      where: { userId, itemRef: threshold.ref, kind: "THRESHOLD_LETTER" },
      orderBy: { createdAt: "desc" },
    });
    letter = last?.thresholdAnswer ?? null;
  }
  return {
    level,
    kind: "level" as const,
    topicGaps: gaps,
    topicsCovered: gaps.length === 0,
    threshold: threshold ? { ref: threshold.ref, title: threshold.title, complete: thresholdDone } : null,
    letterRequired: !!threshold?.thresholdLetter,
    letterAnswer: letter,
    topicLock: await getSetting("transitionTopicLock"),
  };
}

export type TransitionResult =
  | { ok: true; toLevel: number }
  | { ok: false; reason: "not-current" | "statement" | "threshold" | "letter" | "ready" | "topics" | "last-level" };

export async function moveToNextLevel(
  userId: string,
  input: { fromLevel: number; statementConfirmed?: boolean; readyTick?: boolean },
): Promise<TransitionResult> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (input.fromLevel !== user.currentLevel) return { ok: false, reason: "not-current" };
  if (user.currentLevel >= 8) return { ok: false, reason: "last-level" };
  const to = user.currentLevel + 1;

  let snapshot: Record<string, unknown>;
  if (user.currentLevel === 0) {
    if (!input.statementConfirmed) return { ok: false, reason: "statement" };
    snapshot = { statement: TUTORIAL_STATEMENT, confirmed: true };
  } else {
    const c = await transitionConditions(userId, user.currentLevel);
    if (c.kind !== "level") throw new Error("unreachable");
    if (!c.threshold?.complete) return { ok: false, reason: "threshold" };
    if (c.letterRequired && c.letterAnswer !== "YES") return { ok: false, reason: "letter" };
    if (!input.readyTick) return { ok: false, reason: "ready" };
    if (c.topicLock && !c.topicsCovered) return { ok: false, reason: "topics" };
    snapshot = {
      topicGaps: c.topicGaps.map((t) => t.id),
      thresholdComplete: true,
      letterAnswer: c.letterAnswer,
      readyTick: true,
    };
  }

  await db.$transaction([
    db.levelTransition.create({ data: { userId, fromLevel: user.currentLevel, toLevel: to, conditionsSnapshot: snapshot as object } }),
    db.logEntry.create({
      data: {
        userId,
        kind: "TRANSITION",
        level: to,
        itemTitle: `Moved from ${getLevel(user.currentLevel)?.name} to ${getLevel(to)?.name}`,
        did: user.currentLevel === 0 ? TUTORIAL_STATEMENT : "",
      },
    }),
    db.user.update({ where: { id: userId }, data: { currentLevel: to, focusLevel: null } }),
  ]);
  return { ok: true, toLevel: to };
}

/** Returning to any open level is a normal action (the spiral). */
export async function setFocusLevel(userId: string, level: number) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (level < 0 || level > user.currentLevel) throw new Error("Level not open yet");
  return db.user.update({ where: { id: userId }, data: { focusLevel: level === user.currentLevel ? null : level } });
}

export function unlockedLevels(currentLevel: number) {
  return Array.from({ length: currentLevel + 1 }, (_, i) => i);
}
