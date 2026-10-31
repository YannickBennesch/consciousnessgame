import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLevel } from "@/lib/content";
import { publicEntriesFor, publicQuestsFor } from "@/lib/visibility";
import { fmtDate, FormTag, levelLabel } from "@/components/ui";

export default async function CommunityPage() {
  const user = await requireUser();
  if (user.visibility !== "VISIBLE") {
    return (
      <>
        <h1>Other players</h1>
        <p>
          Visibility is reciprocal. Only players who have made themselves visible can see other players’ shared entries and
          quests. You are private, so you see nothing here, and nobody sees anything of yours.
        </p>
        <p className="ui">
          <Link href="/profile/settings">Change visibility in Settings</Link>
        </p>
      </>
    );
  }
  const [quests, entries] = await Promise.all([publicQuestsFor(user.id), publicEntriesFor(user.id, { take: 30 })]);
  const topicTitle = (level: number, id: string) => getLevel(level)?.topics.find((t) => t.id === id)?.title ?? id;

  return (
    <>
      <h1>Other players</h1>
      <h2>Community challenges and quests</h2>
      <p className="muted small ui">Ordered by level and topic, then newest. Shown without names.</p>
      {quests.length === 0 ? (
        <p className="muted">None shared yet.</p>
      ) : (
        <ul className="cards">
          {quests.map((q) => (
            <li key={q.id} className="card">
              <Link className="stretch" href={`/profile/item?ref=${encodeURIComponent(`player:${q.id}`)}`}>
                <h3>{q.title}</h3>
              </Link>
              <div className="meta">
                <FormTag form={q.form} />
                <span>{levelLabel(getLevel(q.level)!)}</span>
                <span>{q.topicIds.map((t) => topicTitle(q.level, t)).join("; ")}</span>
                <span>{q.duration}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Shared log entries</h2>
      {entries.length === 0 ? (
        <p className="muted">None shared yet.</p>
      ) : (
        <ul className="cards">
          {entries.map((e) => (
            <li key={e.id} className="card">
              <h3>{e.itemTitle ?? "Free entry"}</h3>
              <div className="meta">
                <span>{fmtDate(e.date)}</span>
                <span>{levelLabel(getLevel(e.level)!)}</span>
              </div>
              {e.did ? <p>{e.did}</p> : null}
              {e.changed ? (
                <p>
                  <strong>What changed:</strong> {e.changed}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
