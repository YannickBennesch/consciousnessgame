import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLevel } from "@/lib/content";
import { resolveItem } from "@/lib/game";
import { fmtDate, FormTag, levelLabel, Swatch } from "@/components/ui";
import { getT } from "@/lib/i18n";

export default async function ProfileHome() {
  const user = await requireUser();
  const t = await getT("status");
  const working = user.focusLevel ?? user.currentLevel;
  const level = getLevel(working)!;
  const open = await db.itemProgress.findMany({
    where: { userId: user.id, status: { in: ["IN_PROGRESS", "POSTPONED"] } },
    orderBy: { updatedAt: "desc" },
  });
  const openItems = (await Promise.all(open.map(async (p) => ({ p, item: await resolveItem(p.itemRef) })))).filter((x) => x.item);
  const recent = await db.logEntry.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 5 });

  return (
    <>
      <h1>Home</h1>
      <p className="ui">
        You are working in{" "}
        <Link href={working === 0 ? "/profile/tutorial" : `/profile/levels/${level.slug}`}>
          <Swatch level={level} />
          {levelLabel(level)}
        </Link>
        .
        {user.focusLevel !== null ? (
          <span className="muted"> The furthest level you have opened is {levelLabel(getLevel(user.currentLevel)!)}.</span>
        ) : null}
      </p>

      <h2>Open items</h2>
      {openItems.length === 0 ? (
        <p className="muted">Nothing open at the moment.</p>
      ) : (
        <ul className="cards">
          {openItems.map(({ p, item }) => (
            <li key={p.id} className="card">
              <Link className="stretch" href={`/profile/item?ref=${encodeURIComponent(p.itemRef)}`}>
                <h3>{item!.title}</h3>
              </Link>
              <div className="meta">
                <FormTag form={item!.form} />
                <span>{t(p.status)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Recent log entries</h2>
      {recent.length === 0 ? (
        <p className="muted">Your log is empty so far.</p>
      ) : (
        <ul className="cards">
          {recent.map((e) => (
            <li key={e.id} className="card">
              <Link className="stretch" href={`/profile/log/${e.id}`}>
                <h3>{e.itemTitle ?? "Free entry"}</h3>
              </Link>
              <div className="meta">
                <span>{fmtDate(e.date)}</span>
                <span>{levelLabel(getLevel(e.level)!)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="ui">
        <Link href="/profile/log/new">Write a log entry</Link> · <Link href="/profile/gratitude">Gratitude</Link>
      </p>
    </>
  );
}
