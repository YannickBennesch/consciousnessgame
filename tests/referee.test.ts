import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { completeItem, getProgress, logExerciseSession, OPEN_MESSAGE, refereeVerdict, setStatus, updateEntry } from "@/lib/game";
import { ENTRY, makeUser, resetDb, YES } from "./helpers";

const CHALLENGE = "core:red/the-repair";
const EXERCISE = "core:red/standing-ground";

describe("inner referee dialog", () => {
  beforeEach(resetDb);

  it("verdict is complete only with three yeses", () => {
    expect(refereeVerdict(["yes", "yes", "yes"])).toBe("complete");
    for (const a of [
      ["not-yet", "yes", "yes"],
      ["yes", "not-yet", "yes"],
      ["yes", "yes", "not-yet"],
      ["yes", "yes"],
      [],
    ]) {
      expect(refereeVerdict(a)).toBe("open");
    }
  });

  it("any 'not yet' leaves the challenge open with the neutral message and no log entry", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await setStatus(u.id, CHALLENGE, "IN_PROGRESS");
    const res = await completeItem(u.id, CHALLENGE, ["yes", "not-yet", "yes"], ENTRY);
    expect(res).toEqual({ verdict: "open", message: OPEN_MESSAGE });
    expect(OPEN_MESSAGE).toBe("This stays open. There is no penalty for an open challenge.");
    expect((await getProgress(u.id, CHALLENGE))?.status).toBe("IN_PROGRESS");
    expect(await db.logEntry.count({ where: { userId: u.id } })).toBe(0);
  });

  it("three yeses write the log entry and mark the item complete", async () => {
    const u = await makeUser({ currentLevel: 1 });
    const res = await completeItem(u.id, CHALLENGE, YES, ENTRY);
    expect(res.verdict).toBe("complete");
    const p = await getProgress(u.id, CHALLENGE);
    expect(p?.status).toBe("COMPLETE");
    const entry = await db.logEntry.findFirstOrThrow({ where: { userId: u.id } });
    expect(entry).toMatchObject({ level: 1, topicIds: ["material-competence"], visibility: "PRIVATE", itemTitle: "The Repair" });
  });

  it("exercises cannot be completed; they log sessions", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await expect(completeItem(u.id, EXERCISE, YES, ENTRY)).rejects.toThrow();
    await logExerciseSession(u.id, EXERCISE, ENTRY);
    await logExerciseSession(u.id, EXERCISE, ENTRY);
    expect(await db.logEntry.count({ where: { userId: u.id, kind: "EXERCISE_SESSION" } })).toBe(2);
    expect((await getProgress(u.id, EXERCISE))?.status).toBe("IN_PROGRESS");
  });

  it("postponing has no consequence and can be undone", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await setStatus(u.id, CHALLENGE, "POSTPONED");
    expect((await getProgress(u.id, CHALLENGE))?.status).toBe("POSTPONED");
    await setStatus(u.id, CHALLENGE, "IN_PROGRESS");
    expect((await getProgress(u.id, CHALLENGE))?.postponedAt).toBeNull();
  });

  it("edits keep a revision history", async () => {
    const u = await makeUser({ currentLevel: 1 });
    const res = await completeItem(u.id, CHALLENGE, YES, ENTRY);
    if (res.verdict !== "complete") throw new Error();
    await updateEntry(u.id, res.entry.id, { changed: "More changed than I first saw." });
    const revs = await db.logRevision.findMany({ where: { entryId: res.entry.id } });
    expect(revs).toHaveLength(1);
    expect((revs[0].snapshot as { changed: string }).changed).toBe("Something changed.");
    const other = await makeUser();
    await expect(updateEntry(other.id, res.entry.id, { did: "x" })).rejects.toThrow();
  });
});
