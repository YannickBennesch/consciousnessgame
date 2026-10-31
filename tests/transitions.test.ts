import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { completeItem, moveToNextLevel, setFocusLevel, topicMap, transitionConditions, writeThresholdLetter } from "@/lib/game";
import { getItemsForLevel, getLevel } from "@/lib/content";
import { setSetting } from "@/lib/settings";
import { ENTRY, makeUser, resetDb, YES } from "./helpers";

const THRESHOLD = "core:red/yes-to-the-earth";

describe("level transitions", () => {
  beforeEach(resetDb);

  it("tutorial -> level 1 is a self-declaration", async () => {
    const u = await makeUser();
    expect(await moveToNextLevel(u.id, { fromLevel: 0 })).toEqual({ ok: false, reason: "statement" });
    expect(await moveToNextLevel(u.id, { fromLevel: 0, statementConfirmed: true })).toEqual({ ok: true, toLevel: 1 });
    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.currentLevel).toBe(1);
    expect(await db.logEntry.count({ where: { userId: u.id, kind: "TRANSITION" } })).toBe(1);
    expect(await db.levelTransition.count({ where: { userId: u.id } })).toBe(1);
  });

  it("level 1 requires the completed Threshold Quest, a 'yes' letter and the ready tick", async () => {
    const u = await makeUser({ currentLevel: 1 });
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: false, reason: "threshold" });

    await completeItem(u.id, THRESHOLD, YES, ENTRY);
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: false, reason: "letter" });

    await writeThresholdLetter(u.id, THRESHOLD, "NOT_YET", "Not yet.");
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: false, reason: "letter" });

    await writeThresholdLetter(u.id, THRESHOLD, "YES_WITH_CONDITIONS", "Yes, if...");
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: false, reason: "letter" });
    // Both non-yes letters are saved as valid entries.
    expect(await db.logEntry.count({ where: { userId: u.id, kind: "THRESHOLD_LETTER" } })).toBe(2);

    await writeThresholdLetter(u.id, THRESHOLD, "YES", "Yes.");
    expect(await moveToNextLevel(u.id, { fromLevel: 1 })).toEqual({ ok: false, reason: "ready" });
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: true, toLevel: 2 });
  });

  it("topic gaps are information only by default (O-1), and a hard lock when configured", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await completeItem(u.id, THRESHOLD, YES, ENTRY);
    await writeThresholdLetter(u.id, THRESHOLD, "YES", "Yes.");
    const c = await transitionConditions(u.id, 1);
    if (c.kind !== "level") throw new Error();
    expect(c.topicGaps.length).toBe(9);

    await setSetting("transitionTopicLock", true);
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: false, reason: "topics" });
    await setSetting("transitionTopicLock", false);
    expect(await moveToNextLevel(u.id, { fromLevel: 1, readyTick: true })).toEqual({ ok: true, toLevel: 2 });
  });

  it("topic map counts entries per topic and shows zero plainly", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await completeItem(u.id, "core:red/the-honest-inventory", YES, ENTRY);
    const map = await topicMap(u.id, 1);
    expect(map).toHaveLength(10);
    expect(map.find((m) => m.topic.id === "security-survival")?.entries).toBe(1);
    expect(map.find((m) => m.topic.id === "material-competence")?.entries).toBe(1);
    expect(map.find((m) => m.topic.id === "trust-ground")?.entries).toBe(0);
  });

  it("levels 2 to 8 are in preparation and do not break the flow", async () => {
    for (let n = 2; n <= 8; n++) {
      expect(getLevel(n)?.status).toBe("in-preparation");
      expect(getItemsForLevel(n)).toEqual([]);
    }
    const u = await makeUser({ currentLevel: 2 });
    const c = await transitionConditions(u.id, 2);
    expect(c.kind === "level" && c.threshold).toBeNull();
    expect(await moveToNextLevel(u.id, { fromLevel: 2, readyTick: true })).toEqual({ ok: false, reason: "threshold" });
  });

  it("returning to an earlier level works; later levels stay closed", async () => {
    const u = await makeUser({ currentLevel: 2 });
    await setFocusLevel(u.id, 0);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).focusLevel).toBe(0);
    await setFocusLevel(u.id, 2);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).focusLevel).toBeNull();
    await expect(setFocusLevel(u.id, 3)).rejects.toThrow();
  });

  it("a stale transition request cannot skip a level", async () => {
    const u = await makeUser({ currentLevel: 1 });
    expect(await moveToNextLevel(u.id, { fromLevel: 0, statementConfirmed: true })).toEqual({ ok: false, reason: "not-current" });
  });
});
