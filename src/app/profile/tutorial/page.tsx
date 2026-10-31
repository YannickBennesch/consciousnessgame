import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTutorial } from "@/lib/content";

export default async function TutorialIndex() {
  const user = await requireUser();
  const units = getTutorial();
  return (
    <>
      <h1>Tutorial</h1>
      <p>
        The tutorial is organised around three questions. Its goal is contact with the inner referee. Take your time; you can
        come back to it at any point.
      </p>
      <ul className="cards">
        {units.map((u) => (
          <li key={u.slug} className="card">
            <Link className="stretch" href={`/profile/tutorial/${u.slug}`}>
              <h3>{u.title}</h3>
            </Link>
          </li>
        ))}
      </ul>
      {user.currentLevel === 0 ? (
        <p className="ui">
          <Link href="/profile/next">When you are ready: move to Level 1</Link>
        </p>
      ) : null}
    </>
  );
}
