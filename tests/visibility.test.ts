import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { completeItem, createFreeEntry } from "@/lib/game";
import { createQuest, setSharing } from "@/lib/quests";
import { canViewQuest, publicEntriesFor, publicQuestsFor } from "@/lib/visibility";
import { ENTRY, makeUser, resetDb, YES } from "./helpers";

const QUEST = {
  title: "Morning Bread",
  level: 1,
  topicIds: ["material-competence"],
  form: "challenge",
  duration: "3 days",
  description: "Bake bread for the household three mornings in a row.",
  stages: [],
  completeWhen: "three loaves were baked and eaten.",
};

async function sharedQuest(authorId: string) {
  const q = await createQuest(authorId, QUEST);
  await completeItem(authorId, `player:${q.id}`, YES, ENTRY);
  expect(await setSharing(authorId, q.id, "PUBLIC")).toEqual({ ok: true });
  return q;
}

describe("reciprocal visibility", () => {
  beforeEach(resetDb);

  it("a private player sees no other player's content", async () => {
    const author = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    await createFreeEntry(author.id, 1, { ...ENTRY, visibility: "VISIBLE" });
    await sharedQuest(author.id);

    const privateViewer = await makeUser({ visibility: "PRIVATE" });
    expect(await publicEntriesFor(privateViewer.id)).toEqual([]);
    expect(await publicQuestsFor(privateViewer.id)).toEqual([]);
  });

  it("a visible player sees public entries and quests only from other visible players", async () => {
    const visibleAuthor = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    const privateAuthor = await makeUser({ visibility: "PRIVATE", currentLevel: 1 });
    await createFreeEntry(visibleAuthor.id, 1, { ...ENTRY, did: "visible-public", visibility: "VISIBLE" });
    await createFreeEntry(visibleAuthor.id, 1, { ...ENTRY, did: "visible-private", visibility: "PRIVATE" });
    // A private player's entry marked "visible" must still stay hidden.
    await createFreeEntry(privateAuthor.id, 1, { ...ENTRY, did: "private-author", visibility: "VISIBLE" });

    const viewer = await makeUser({ visibility: "VISIBLE" });
    const seen = (await publicEntriesFor(viewer.id)).map((e) => e.did);
    expect(seen).toEqual(["visible-public"]);
    // No account data leaks into the feed.
    expect(JSON.stringify(await publicEntriesFor(viewer.id))).not.toContain("@example.test");
  });

  it("switching to private hides the player's public content immediately", async () => {
    const author = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    await createFreeEntry(author.id, 1, { ...ENTRY, visibility: "VISIBLE" });
    const q = await sharedQuest(author.id);
    const viewer = await makeUser({ visibility: "VISIBLE" });
    expect(await publicEntriesFor(viewer.id)).toHaveLength(1);
    expect(await publicQuestsFor(viewer.id)).toHaveLength(1);

    await db.user.update({ where: { id: author.id }, data: { visibility: "PRIVATE" } });
    expect(await publicEntriesFor(viewer.id)).toHaveLength(0);
    expect(await publicQuestsFor(viewer.id)).toHaveLength(0);
    expect(await canViewQuest(viewer.id, await db.playerQuest.findUniqueOrThrow({ where: { id: q.id } }))).toBe(false);
  });

  it("public quests are listed without author identity", async () => {
    const author = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    await sharedQuest(author.id);
    const viewer = await makeUser({ visibility: "VISIBLE" });
    const [q] = await publicQuestsFor(viewer.id);
    expect(q.authorId).toBeNull();
  });

  it("a quest can be shared beyond private only after the author completed it", async () => {
    const author = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    const q = await createQuest(author.id, QUEST);
    expect(await setSharing(author.id, q.id, "PUBLIC")).toEqual({ ok: false, reason: "not-tested" });
    await completeItem(author.id, `player:${q.id}`, YES, ENTRY);
    expect(await setSharing(author.id, q.id, "PUBLIC")).toEqual({ ok: true });
  });

  it("public sharing is soft-limited with a notice the player can acknowledge", async () => {
    const author = await makeUser({ visibility: "VISIBLE", currentLevel: 1 });
    await sharedQuest(author.id);
    const q2 = await createQuest(author.id, { ...QUEST, title: "Second" });
    await completeItem(author.id, `player:${q2.id}`, YES, ENTRY);
    expect(await setSharing(author.id, q2.id, "PUBLIC")).toMatchObject({ ok: false, reason: "soft-limit" });
    expect(await setSharing(author.id, q2.id, "PUBLIC", { acknowledgedLimit: true })).toEqual({ ok: true });
  });
});
