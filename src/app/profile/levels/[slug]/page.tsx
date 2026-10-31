import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getItemsForLevel, getLevelBySlug } from "@/lib/content";
import { promotedCoreQuests } from "@/lib/quests";
import { accentStyle, FormTag, levelLabel, Swatch } from "@/components/ui";
import { getT } from "@/lib/i18n";

export default async function LevelPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const level = getLevelBySlug((await params).slug);
  if (!level || level.number === 0) notFound();
  if (level.number > user.currentLevel) {
    return (
      <>
        <h1>
          <Swatch level={level} />
          {levelLabel(level)}
        </h1>
        <p>This level opens when you move on to it.</p>
      </>
    );
  }
  const t = await getT("status");
  const items = getItemsForLevel(level.number);
  const promoted = await promotedCoreQuests(level.number);
  const progress = await db.itemProgress.findMany({ where: { userId: user.id } });
  const statusOf = (ref: string) => progress.find((p) => p.itemRef === ref)?.status ?? "NOT_STARTED";
  const all = [
    ...items.map((i) => ({ ref: i.ref, title: i.title, form: i.form as string, topics: i.topics, duration: i.duration })),
    ...promoted.map((q) => ({ ref: `player:${q.id}`, title: q.title, form: q.form, topics: q.topicIds, duration: q.duration })),
  ];
  const topicTitle = (id: string) => level.topics.find((t) => t.id === id)?.title ?? id;

  return (
    <div className="level-band" style={accentStyle(level)}>
      <h1>
        <Swatch level={level} />
        {levelLabel(level)}
      </h1>
      {level.status === "in-preparation" ? (
        <div className="notice">
          <p>This level is in preparation. Everything before it stays fully open to you.</p>
        </div>
      ) : (
        <>
          {level.chakra ? <p className="muted ui">{level.chakra}</p> : null}
          <p className="lede">{level.centralTheme}</p>

          <h2>Topics</h2>
          <ol>
            {level.topics.map((t) => (
              <li key={t.id}>
                <strong>{t.title}.</strong> {t.description}
              </li>
            ))}
          </ol>

          <h2>Exercises, challenges and quests</h2>
          <ul className="cards">
            {all.map((i) => (
              <li key={i.ref} className="card">
                <Link className="stretch" href={`/profile/item?ref=${encodeURIComponent(i.ref)}`}>
                  <h3>{i.title}</h3>
                </Link>
                <div className="meta">
                  <FormTag form={i.form} />
                  <span>{i.duration}</span>
                  <span>{i.topics.map(topicTitle).join("; ")}</span>
                  {i.form !== "exercise" ? <span>{t(statusOf(i.ref))}</span> : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="ui small">
            <Link href="/profile/quests/new">Design your own challenge or quest</Link>
          </p>
        </>
      )}
      {level.number === user.currentLevel && level.number < 8 ? (
        <p className="ui">
          <Link href="/profile/next">Move to the next level</Link>
        </p>
      ) : null}
    </div>
  );
}
