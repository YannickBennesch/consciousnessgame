import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { deleteAccount, exportAsHtml, exportUserData, getPrivateDetails, savePrivateDetails } from "@/lib/account";
import { createBatch } from "@/lib/codes";
import { completeItem } from "@/lib/game";
import { createQuest } from "@/lib/quests";
import { contentHints, getDocs, getTutorial, outlineSection } from "@/lib/content";
import { ENTRY, makeUser, resetDb, YES } from "./helpers";

describe("private details, export and deletion", () => {
  beforeEach(resetDb);

  it("private details are encrypted at rest and readable only through the player's own view", async () => {
    const u = await makeUser();
    await savePrivateDetails(u.id, { birthDate: "1990-04-02", birthTime: "06:15", birthPlace: "Hamburg" });
    const raw = await db.privateDetails.findUniqueOrThrow({ where: { userId: u.id } });
    expect(JSON.stringify(raw)).not.toContain("Hamburg");
    expect(JSON.stringify(raw)).not.toContain("1990");
    expect(await getPrivateDetails(u.id)).toEqual({ birthDate: "1990-04-02", birthTime: "06:15", birthPlace: "Hamburg" });
  });

  it("exports everything as JSON and HTML", async () => {
    const u = await makeUser({ currentLevel: 1 });
    await savePrivateDetails(u.id, { birthPlace: "Lisboa" });
    await completeItem(u.id, "core:red/the-repair", YES, { ...ENTRY, did: "<b>fixed</b> the tap" });
    const data = await exportUserData(u.id);
    expect(data.log).toHaveLength(1);
    expect(data.privateDetails.birthPlace).toBe("Lisboa");
    const html = exportAsHtml(data);
    expect(html).toContain("&lt;b&gt;fixed&lt;/b&gt;");
  });

  it("deletes the account, log, quests and details; the code is retired, not re-issued", async () => {
    const u = await makeUser({ currentLevel: 1 });
    const batch = await createBatch("tutorial-bw", 1);
    const code = await db.playerCode.findFirstOrThrow({ where: { batchId: batch.id } });
    await db.playerCode.update({ where: { code: code.code }, data: { status: "ACTIVATED", userId: u.id } });
    await savePrivateDetails(u.id, { birthPlace: "Lisboa" });
    await completeItem(u.id, "core:red/the-repair", YES, ENTRY);
    await createQuest(u.id, {
      title: "Mine",
      level: 1,
      topicIds: ["material-competence"],
      form: "challenge",
      duration: "1 day",
      description: "A description long enough.",
      completeWhen: "done",
    });

    await deleteAccount(u.id);
    expect(await db.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(await db.logEntry.count()).toBe(0);
    expect(await db.playerQuest.count()).toBe(0);
    expect(await db.privateDetails.count()).toBe(0);
    expect(await db.playerCode.findUniqueOrThrow({ where: { code: code.code } })).toMatchObject({ status: "RETIRED", userId: null });
  });
});

describe("content", () => {
  it("loads docs and tutorial from the outline in the authors' wording", () => {
    expect(outlineSection("The inner referee and the three questions")).toContain("in substance and not only in form");
    expect(getDocs().map((d) => d.slug)).toContain("sacred-sundays");
    expect(getTutorial().map((t) => t.question)).toEqual(["why", "how", "what"]);
  });

  it("has valid Level 1 content", () => {
    const hints = contentHints();
    // The outline's Honest Inventory has two topics although challenges usually have one (see DECISIONS.md).
    expect(hints).toEqual([expect.stringContaining("the-honest-inventory")]);
  });
});
