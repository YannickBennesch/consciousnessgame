import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveItem } from "@/lib/game";
import { canViewQuest } from "@/lib/visibility";

/** Core items of unlocked levels, own quests, and player quests the viewer may see. */
export async function canUseItem(user: User, ref: string) {
  const item = await resolveItem(ref);
  if (!item) return null;
  if (item.playerQuestId) {
    const q = await db.playerQuest.findUniqueOrThrow({ where: { id: item.playerQuestId } });
    if (!(await canViewQuest(user.id, q))) return null;
    if (q.kind === "CORE" && q.level > user.currentLevel) return null;
    return item;
  }
  return item.level <= user.currentLevel ? item : null;
}

export async function assertCanUseItem(user: User, ref: string) {
  const item = await canUseItem(user, ref);
  if (!item) throw new Error("Not available");
  return item;
}
