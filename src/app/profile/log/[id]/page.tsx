import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLevel } from "@/lib/content";
import { updateEntry } from "@/lib/game";
import { str } from "@/lib/request";
import { EntryFields } from "@/components/entry-fields";
import { fmtDate, levelLabel, Notice } from "@/components/ui";

async function save(form: FormData) {
  "use server";
  const user = await requireUser();
  const id = str(form, "id");
  await updateEntry(user.id, id, {
    did: str(form, "did"),
    changed: str(form, "changed"),
    refereeSaid: str(form, "refereeSaid"),
    visibility: str(form, "visibility") === "VISIBLE" ? "VISIBLE" : "PRIVATE",
    date: str(form, "date") ? new Date(str(form, "date")) : undefined,
  });
  revalidatePath("/profile", "layout");
  redirect(`/profile/log/${id}?saved=1`);
}

type Snapshot = { date: string; did: string; changed: string; refereeSaid: string };

export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await db.logEntry.findFirst({
    where: { id, userId: user.id },
    include: { revisions: { orderBy: { createdAt: "desc" } } },
  });
  if (!entry || entry.kind === "TRANSITION") notFound();
  const level = getLevel(entry.level)!;
  return (
    <>
      <p className="ui small">
        <Link href="/profile/log">Player log</Link>
      </p>
      <h1>{entry.itemTitle ?? "Free entry"}</h1>
      <p className="meta">
        <span>{levelLabel(level)}</span>
        {entry.topicIds.length ? <span>{entry.topicIds.map((t) => level.topics.find((x) => x.id === t)?.title ?? t).join("; ")}</span> : null}
        {entry.itemRef ? <Link href={`/profile/item?ref=${encodeURIComponent(entry.itemRef)}`}>Open the item</Link> : null}
      </p>
      {(await searchParams).saved ? (
        <Notice role="status">
          <p>Saved.</p>
        </Notice>
      ) : null}
      <form action={save}>
        <input type="hidden" name="id" value={entry.id} />
        <EntryFields entry={entry} visibleAllowed={user.visibility === "VISIBLE"} />
        <div className="actions">
          <button type="submit">Save changes</button>
        </div>
      </form>
      {entry.revisions.length > 0 ? (
        <section aria-labelledby="rev-h">
          <h2 id="rev-h">Earlier versions</h2>
          <p className="muted small ui">Only you can see these.</p>
          {entry.revisions.map((r) => {
            const s = r.snapshot as Snapshot;
            return (
              <details key={r.id} className="card">
                <summary className="ui">Version saved before {fmtDate(r.createdAt)}</summary>
                <p>
                  <strong>What I did:</strong> {s.did}
                </p>
                <p>
                  <strong>What changed:</strong> {s.changed}
                </p>
                <p>
                  <strong>What the inner referee said:</strong> {s.refereeSaid}
                </p>
              </details>
            );
          })}
        </section>
      ) : null}
    </>
  );
}
