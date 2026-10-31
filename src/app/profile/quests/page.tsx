import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLevel } from "@/lib/content";
import { FormTag, levelLabel } from "@/components/ui";

const SHARING = { PRIVATE: "Private", CIRCLE: "Circle of trust", PUBLIC: "Public" } as const;

export default async function MyQuests() {
  const user = await requireUser();
  const quests = await db.playerQuest.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <h1>My quests</h1>
      <p>
        Design your own challenges and quests. Once you have played one yourself and marked it complete, you can share it.
      </p>
      <p>
        <Link className="btn" href="/profile/quests/new">
          Design a challenge or quest
        </Link>
      </p>
      {quests.length === 0 ? null : (
        <ul className="cards">
          {quests.map((q) => (
            <li key={q.id} className="card">
              <Link className="stretch" href={`/profile/quests/${q.id}`}>
                <h3>{q.title}</h3>
              </Link>
              <div className="meta">
                <FormTag form={q.form} />
                <span>{levelLabel(getLevel(q.level)!)}</span>
                <span>{SHARING[q.sharing]}</span>
                <span>{q.testedAt ? "Tested" : "Not tested yet"}</span>
                {q.kind === "CORE" ? <span>Accepted as a core quest</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
