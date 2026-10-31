import { z } from "zod";
import { db } from "./db";
import { hashToken, randomToken } from "./crypto";
import { isWellFormed, normalizeCode } from "./codes";
import { hit } from "./ratelimit";
import { sendMail } from "./email";
import { bootstrapRoles } from "./auth";

const LINK_MINUTES = 30;
const HOUR = 3600_000;

export type ActivationResult =
  | { ok: true }
  | { ok: false; reason: "invalid-input" | "rate-limited" | "unknown-code" | "in-play" };

const Email = z.string().trim().toLowerCase().email().max(254);

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Step 3–4 of the entry flow (§4): code + e-mail -> magic link. */
export async function requestActivation(input: { code: string; email: string; ip: string }): Promise<ActivationResult> {
  const email = Email.safeParse(input.email);
  const code = normalizeCode(input.code ?? "");
  if (!email.success) return { ok: false, reason: "invalid-input" };

  // Rate limits before any lookup, so they also slow down enumeration.
  const ipOk = await hit(`code:ip:${input.ip}`, 20, HOUR);
  const mailOk = await hit(`code:mail:${email.data}`, 8, HOUR);
  if (!ipOk || !mailOk) return { ok: false, reason: "rate-limited" };

  if (!isWellFormed(code)) return { ok: false, reason: "unknown-code" };
  const row = await db.playerCode.findUnique({ where: { code } });
  if (!row) return { ok: false, reason: "unknown-code" };
  if (row.status !== "UNUSED") return { ok: false, reason: "in-play" };

  const token = randomToken();
  await db.magicLink.create({
    data: {
      tokenHash: hashToken(token),
      email: email.data,
      code,
      expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
    },
  });
  await sendMail({
    to: email.data,
    subject: "Your link to the game",
    text: [
      "Here is your link to your player profile:",
      "",
      `${appUrl()}/auth/verify?token=${token}`,
      "",
      `The link works once and for ${LINK_MINUTES} minutes.`,
      "If you did not ask for it, you can ignore this e-mail.",
    ].join("\n"),
  });
  return { ok: true };
}

/** Sign-in for existing players. Always answers the same way, whether the address is known or not. */
export async function requestSignIn(input: { email: string; ip: string }): Promise<{ ok: boolean }> {
  const email = Email.safeParse(input.email);
  if (!email.success) return { ok: false };
  const ipOk = await hit(`signin:ip:${input.ip}`, 20, HOUR);
  const mailOk = await hit(`signin:mail:${email.data}`, 5, HOUR);
  if (!ipOk || !mailOk) return { ok: true };
  const user = await db.user.findUnique({ where: { email: email.data } });
  if (!user) return { ok: true };
  const token = randomToken();
  await db.magicLink.create({
    data: { tokenHash: hashToken(token), email: email.data, expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) },
  });
  await sendMail({
    to: email.data,
    subject: "Your sign-in link",
    text: `Sign in to your player profile:\n\n${appUrl()}/auth/verify?token=${token}\n\nThe link works once and for ${LINK_MINUTES} minutes.`,
  });
  return { ok: true };
}

export type ConsumeResult =
  | { ok: true; userId: string; isNew: boolean }
  | { ok: false; reason: "invalid-link" | "in-play" };

/** Step 5: following the link creates the account, binds the code, and signs in. */
export async function consumeMagicLink(token: string): Promise<ConsumeResult> {
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    // Mark as used atomically; only one request can win.
    const claimed = await tx.magicLink.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return { ok: false, reason: "invalid-link" } as const;
    const link = (await tx.magicLink.findUnique({ where: { tokenHash } }))!;

    let user = await tx.user.findUnique({ where: { email: link.email } });
    const isNew = !user;

    if (link.code) {
      if (!user) user = await tx.user.create({ data: { email: link.email, roles: bootstrapRoles(link.email) } });
      const bound = await tx.playerCode.updateMany({
        where: { code: link.code, status: "UNUSED" },
        data: { status: "ACTIVATED", activatedAt: new Date(), userId: user.id },
      });
      if (bound.count !== 1) {
        // Someone else activated it between request and click. Roll back a just-created account.
        if (isNew) await tx.user.delete({ where: { id: user.id } });
        return { ok: false, reason: "in-play" } as const;
      }
    } else if (!user) {
      return { ok: false, reason: "invalid-link" } as const;
    }
    return { ok: true, userId: user.id, isNew } as const;
  });
}
