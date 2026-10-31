import { z } from "zod";
import { db } from "./db";
import { sendMail } from "./email";
import { hit } from "./ratelimit";

export const SUPPORT_NOTICE =
  "Support contacts are fellow players, not therapists or crisis services. In an acute emergency, contact local emergency services (112 in the EU) or a crisis line.";

const Input = z.object({
  message: z.string().trim().min(1).max(5000),
  itemRef: z.string().max(200).nullish(),
  replyTo: z.string().trim().toLowerCase().email().nullish(),
});

/** Stored in the platform plus an e-mail notification to the support contacts (§8). */
export async function createSupportRequest(userId: string | null, raw: unknown, ip: string) {
  const input = Input.parse(raw);
  if (!(await hit(`support:${userId ?? ip}`, 10, 3600_000))) throw new Error("Please wait a little before sending again.");
  const request = await db.supportRequest.create({
    data: { userId, message: input.message, itemRef: input.itemRef ?? null, replyTo: input.replyTo ?? null },
  });
  const contacts = await db.user.findMany({ where: { roles: { has: "SUPPORT" } }, select: { email: true } });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  // The notification does not contain the message itself, only a link to read it on the platform.
  await Promise.all(
    contacts.map((c) =>
      sendMail({
        to: c.email,
        subject: "A player has asked for support",
        text: `A new support request is waiting.\n\n${base}/admin/support#${request.id}`,
      }),
    ),
  );
  return request;
}
