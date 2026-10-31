import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { FORM_LABELS, FORMS, getLevel, getLevels } from "@/lib/content";
import { fmtDate, levelLabel } from "@/components/ui";

const KIND_LABEL: Record<string, string> = {
  EXERCISE_SESSION: "Exercise session",
  THRESHOLD_LETTER: "Threshold letter",
  TRANSITION: "Level transition",
};

export default async function LogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const levels = getLevels().filter((l) => l.number <= user.currentLevel);
  const where: Prisma.LogEntryWhereInput = { userId: user.id };
  if (sp.level) where.level = Number(sp.level);
  if (sp.topic) where.topicIds = { has: sp.topic };
  if (sp.form) where.form = sp.form === "free" ? null : sp.form;
  const entries = await db.logEntry.findMany({ where, orderBy: { date: "desc" } });
  const topics = levels.flatMap((l) => l.topics.map((t) => ({ ...t, level: l.number })));

  return (
    <>
      <h1>Player log</h1>
      <p className="ui">
        <Link href="/profile/log/new">Write a free entry</Link>
      </p>
      <form method="get" className="actions" aria-label="Filter the log">
        <div>
          <label htmlFor="f-level">Level</label>
          <select id="f-level" name="level" defaultValue={sp.level ?? ""}>
            <option value="">All</option>
            {levels.map((l) => (
              <option key={l.number} value={l.number}>
                {levelLabel(l)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-topic">Topic</label>
          <select id="f-topic" name="topic" defaultValue={sp.topic ?? ""}>
            <option value="">All</option>
            {topics.map((t) => (
              <option key={`${t.level}-${t.id}`} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-form">Form</label>
          <select id="f-form" name="form" defaultValue={sp.form ?? ""}>
            <option value="">All</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {FORM_LABELS[f]}
              </option>
            ))}
            <option value="free">Free entries</option>
          </select>
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button type="submit" className="secondary">
            Filter
          </button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="muted">No entries here.</p>
      ) : (
        <ul className="cards">
          {entries.map((e) => (
            <li key={e.id} className="card">
              {e.kind === "TRANSITION" ? (
                <h3>{e.itemTitle}</h3>
              ) : (
                <Link className="stretch" href={`/profile/log/${e.id}`}>
                  <h3>{e.itemTitle ?? "Free entry"}</h3>
                </Link>
              )}
              <div className="meta">
                <span>{fmtDate(e.date)}</span>
                <span>{levelLabel(getLevel(e.level)!)}</span>
                {KIND_LABEL[e.kind] ? <span>{KIND_LABEL[e.kind]}</span> : null}
                {e.visibility === "VISIBLE" ? <span>Shared with visible players</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
