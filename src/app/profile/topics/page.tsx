import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLevels } from "@/lib/content";
import { topicMap } from "@/lib/game";
import { levelLabel, Swatch } from "@/components/ui";

export default async function TopicsPage() {
  const user = await requireUser();
  const levels = getLevels().filter((l) => l.number > 0 && l.number <= user.currentLevel && l.topics.length > 0);
  const maps = await Promise.all(levels.map(async (l) => ({ level: l, map: await topicMap(user.id, l.number) })));
  return (
    <>
      <h1>Topic map</h1>
      <p>Which topics of a level you have worked with, and which you have not touched yet.</p>
      {maps.length === 0 ? <p className="muted">The topic map begins with Level 1.</p> : null}
      {maps.map(({ level, map }) => (
        <section key={level.number} aria-labelledby={`t-${level.number}`}>
          <h2 id={`t-${level.number}`}>
            <Swatch level={level} />
            {levelLabel(level)}
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Topic</th>
                  <th scope="col">Log entries</th>
                </tr>
              </thead>
              <tbody>
                {map.map((m) => (
                  <tr key={m.topic.id}>
                    <th scope="row" style={{ fontWeight: 400 }}>
                      <Link href={`/profile/log?level=${level.number}&topic=${m.topic.id}`}>{m.topic.title}</Link>
                    </th>
                    <td>{m.entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
