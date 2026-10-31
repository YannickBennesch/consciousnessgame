import { revalidatePath } from "next/cache";
import type { CoreState } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { FORM_LABELS, getLevel, type Form } from "@/lib/content";
import { review, reviewQueue, setCoreState } from "@/lib/quests";
import { str } from "@/lib/request";
import { levelLabel } from "@/components/ui";

async function decide(form: FormData) {
  "use server";
  await requireRole("REVIEWER");
  await review(str(form, "id"), str(form, "decision") === "accept" ? "accept" : "decline");
  revalidatePath("/admin/review");
}

async function core(form: FormData) {
  "use server";
  await requireRole("REVIEWER");
  await setCoreState(str(form, "id"), str(form, "state") as CoreState, str(form, "group"));
  revalidatePath("/admin/review");
}

export default async function ReviewPage() {
  await requireRole("REVIEWER");
  const queue = await reviewQueue();
  const cores = await db.playerQuest.findMany({ where: { kind: "CORE" }, orderBy: [{ level: "asc" }, { title: "asc" }] });
  const topicTitle = (level: number, id: string) => getLevel(level)?.topics.find((t) => t.id === id)?.title ?? id;

  return (
    <>
      <h1>Review</h1>
      <p className="ui small muted">
        Community quests appear here once enough players from different circles have completed them and recorded that something
        changed. Authors are not shown (O-7). Popularity alone does not make a core quest.
      </p>
      <h2>Waiting for review</h2>
      {queue.length === 0 ? <p className="muted">Nothing waiting.</p> : null}
      {queue.map((q) => (
        <article key={q.id} className="card" style={{ marginBottom: "1rem" }}>
          <h3>{q.title}</h3>
          <p className="meta">
            <span>{FORM_LABELS[q.form as Form]}</span>
            <span>{levelLabel(getLevel(q.level)!)}</span>
            <span>{q.topicIds.map((t) => topicTitle(q.level, t)).join("; ")}</span>
            <span>{q.duration}</span>
            <span>{q.completions} completions from different circles</span>
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{q.description}</p>
          {q.stages.length ? (
            <ol>
              {q.stages.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : null}
          <p>
            <strong>Complete when:</strong> {q.completeWhen}
          </p>
          <form action={decide} className="actions">
            <input type="hidden" name="id" value={q.id} />
            <button type="submit" name="decision" value="accept">
              Accept as core quest
            </button>
            <button type="submit" name="decision" value="decline" className="secondary">
              Decline
            </button>
          </form>
        </article>
      ))}

      <h2>Accepted core quests</h2>
      <p className="ui small muted">Group, rotate (hide for a while) or retire them if a level becomes hard to find one’s way through.</p>
      {cores.map((q) => (
        <form key={q.id} action={core} className="card actions" style={{ marginBottom: "0.75rem" }}>
          <input type="hidden" name="id" value={q.id} />
          <strong style={{ flexBasis: "100%" }}>
            {q.title} <span className="muted small">({q.coreState.toLowerCase()})</span>
          </strong>
          <div>
            <label htmlFor={`g-${q.id}`}>Group</label>
            <input id={`g-${q.id}`} name="group" type="text" defaultValue={q.coreGroup ?? ""} />
          </div>
          <div>
            <label htmlFor={`st-${q.id}`}>State</label>
            <select id={`st-${q.id}`} name="state" defaultValue={q.coreState}>
              <option value="ACTIVE">active</option>
              <option value="ROTATED">rotated out</option>
              <option value="RETIRED">retired</option>
            </select>
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button type="submit" className="secondary">
              Save
            </button>
          </div>
        </form>
      ))}
    </>
  );
}
