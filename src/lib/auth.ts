import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { hashToken, randomToken } from "./crypto";

export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 60;

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function userFromSessionToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function currentUser(): Promise<User | null> {
  return userFromSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireRole(role: Role): Promise<User> {
  const user = await requireUser();
  if (!user.roles.includes(role)) redirect("/profile");
  return user;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export function bootstrapRoles(email: string): Role[] {
  const admins = (process.env.BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email) ? ["PLAYER", "ADMIN", "REVIEWER", "SUPPORT"] : ["PLAYER"];
}
