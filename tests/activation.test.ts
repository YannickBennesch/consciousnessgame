import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createBatch, formatCode, isWellFormed, normalizeCode, codeUrl, batchCsv, qrSvg } from "@/lib/codes";
import { consumeMagicLink, requestActivation } from "@/lib/activation";
import { lastToken, outbox, resetDb } from "./helpers";

async function oneCode() {
  const batch = await createBatch("tutorial-bw", 1, "test");
  return (await db.playerCode.findFirstOrThrow({ where: { batchId: batch.id } })).code;
}

describe("player codes", () => {
  beforeEach(resetDb);

  it("generates well-formed codes without ambiguous characters", async () => {
    const batch = await createBatch("tutorial-bw", 50);
    const codes = await db.playerCode.findMany({ where: { batchId: batch.id } });
    expect(codes).toHaveLength(50);
    for (const { code } of codes) {
      expect(isWellFormed(code)).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("formats, normalizes and builds the QR URL", () => {
    expect(formatCode("K7QXM4RT2W")).toBe("K7QX-M4RT-2W");
    expect(normalizeCode(" k7qx-m4rt 2w ")).toBe("K7QXM4RT2W");
    expect(codeUrl("K7QXM4RT2W")).toBe("http://localhost:3000/play?code=K7QX-M4RT-2W");
  });

  it("exports CSV and SVG with the code printed under the QR", async () => {
    const batch = await createBatch("red", 2);
    const csv = await batchCsv(batch.id);
    expect(csv.split("\n")[0]).toBe("code,url");
    expect(csv.trim().split("\n")).toHaveLength(3);
    const svg = await qrSvg("K7QXM4RT2W");
    expect(svg).toContain("<svg");
    expect(svg).toContain("K7QX-M4RT-2W");
  });
});

describe("code activation", () => {
  beforeEach(resetDb);

  it("activates a code end to end and creates the player", async () => {
    const code = await oneCode();
    const res = await requestActivation({ code: formatCode(code).toLowerCase(), email: "New@Example.test", ip: "1.1.1.1" });
    expect(res).toEqual({ ok: true });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("new@example.test");

    const consumed = await consumeMagicLink(lastToken());
    expect(consumed).toMatchObject({ ok: true, isNew: true });
    const user = await db.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
    expect(user.currentLevel).toBe(0);
    const row = await db.playerCode.findUniqueOrThrow({ where: { code } });
    expect(row.status).toBe("ACTIVATED");
    expect(row.userId).toBe(user.id);
  });

  it("a magic link works only once", async () => {
    const code = await oneCode();
    await requestActivation({ code, email: "a@example.test", ip: "1.1.1.1" });
    const token = lastToken();
    expect((await consumeMagicLink(token)).ok).toBe(true);
    expect(await consumeMagicLink(token)).toEqual({ ok: false, reason: "invalid-link" });
  });

  it("an activated code cannot be activated again and reveals nothing about its owner", async () => {
    const code = await oneCode();
    await requestActivation({ code, email: "owner@example.test", ip: "1.1.1.1" });
    await consumeMagicLink(lastToken());

    const second = await requestActivation({ code, email: "other@example.test", ip: "2.2.2.2" });
    expect(second).toEqual({ ok: false, reason: "in-play" });
    expect(JSON.stringify(second)).not.toContain("owner");
    expect(outbox.filter((m) => m.to === "other@example.test")).toHaveLength(0);
  });

  it("two pending links for one code: the first click wins, the second gets 'in play'", async () => {
    const code = await oneCode();
    await requestActivation({ code, email: "first@example.test", ip: "1.1.1.1" });
    const t1 = lastToken();
    await requestActivation({ code, email: "second@example.test", ip: "2.2.2.2" });
    const t2 = lastToken();
    expect((await consumeMagicLink(t1)).ok).toBe(true);
    expect(await consumeMagicLink(t2)).toEqual({ ok: false, reason: "in-play" });
    expect(await db.user.findUnique({ where: { email: "second@example.test" } })).toBeNull();
  });

  it("unknown and malformed codes get the same answer", async () => {
    expect(await requestActivation({ code: "ZZZZ-ZZZZ-ZZ", email: "x@example.test", ip: "3.3.3.3" })).toEqual({
      ok: false,
      reason: "unknown-code",
    });
    expect(await requestActivation({ code: "abc", email: "x@example.test", ip: "3.3.3.3" })).toEqual({
      ok: false,
      reason: "unknown-code",
    });
  });

  it("rate-limits attempts per IP and per e-mail", async () => {
    let last;
    for (let i = 0; i < 21; i++) {
      last = await requestActivation({ code: "ZZZZ-ZZZZ-ZZ", email: `x${i}@example.test`, ip: "9.9.9.9" });
    }
    expect(last).toEqual({ ok: false, reason: "rate-limited" });

    for (let i = 0; i < 9; i++) {
      last = await requestActivation({ code: "ZZZZ-ZZZZ-ZZ", email: "same@example.test", ip: `10.0.0.${i}` });
    }
    expect(last).toEqual({ ok: false, reason: "rate-limited" });
  });

  it("an existing player can link another code without any change to game state", async () => {
    const [c1, c2] = [await oneCode(), await oneCode()];
    await requestActivation({ code: c1, email: "p@example.test", ip: "1.1.1.1" });
    await consumeMagicLink(lastToken());
    await db.user.update({ where: { email: "p@example.test" }, data: { currentLevel: 1 } });

    await requestActivation({ code: c2, email: "p@example.test", ip: "1.1.1.1" });
    expect(await consumeMagicLink(lastToken())).toMatchObject({ ok: true, isNew: false });
    const user = await db.user.findUniqueOrThrow({ where: { email: "p@example.test" }, include: { codes: true } });
    expect(user.codes).toHaveLength(2);
    expect(user.currentLevel).toBe(1);
  });
});
