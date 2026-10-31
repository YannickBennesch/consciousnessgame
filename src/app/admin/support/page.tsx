import { revalidatePath } from "next/cache";
import type { SupportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { resolveItem } from "@/lib/game";
import { str } from "@/lib/request";
import { fmtDate } from "@/components/ui";

async function setStatus(form: FormData) {
  "use server";
  await requireRole("SUPPORT");
  await db.supportRequest.update({ where: { id: str(form, "id") }, data: { status: str(form, "status") as SupportStatus } });
  revalidatePath("/admin/support");
}

export default async function SupportRequests() {
  await requireRole("SUPPORT");
  const requests = await db.supportRequest.findMany({
    include: { user: { select: { email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const items = await Promise.all(requests.map((r) => (r.itemRef ? resolveItem(r.itemRef) : null)));
  return (
    <>
      <h1>Support requests</h1>
      <p className="ui small muted">
        You are a fellow player, not a therapist or crisis service. In an acute emergency, point to local emergency services (112
        in the EU) or a crisis line.
      </p>
      <ul className="cards">
        {requests.map((r, i) => (
          <li key={r.id} id={r.id} className="card">
            <div className="meta">
              <span>{fmtDate(r.createdAt)}</span>
              <span>{r.status.toLowerCase().replace("_", " ")}</span>
              <span>Reply to: {r.user?.email ?? r.replyTo ?? "account deleted"}</span>
              {items[i] ? <span>About: {items[i]!.title}</span> : null}
            </div>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
            <form action={setStatus} className="actions">
              <input type="hidden" name="id" value={r.id} />
              {(["OPEN", "IN_CONVERSATION", "CLOSED"] as const)
                .filter((s) => s !== r.status)
                .map((s) => (
                  <button key={s} type="submit" name="status" value={s} className="secondary">
                    Mark {s.toLowerCase().replace("_", " ")}
                  </button>
                ))}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
