import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getLevels } from "@/lib/content";
import { setFocusLevel } from "@/lib/game";
import { levelLabel, Swatch } from "@/components/ui";

async function focus(form: FormData) {
  "use server";
  const user = await requireUser();
  await setFocusLevel(user.id, Number(form.get("level")));
  revalidatePath("/profile", "layout");
}

export default async function LevelsPage() {
  const user = await requireUser();
  const working = user.focusLevel ?? user.currentLevel;
  return (
    <>
      <h1>Levels</h1>
      <p>
        A level is never closed. You can return to any earlier level at any time; the structure of the game is a spiral rather
        than a ladder.
      </p>
      <ul className="cards">
        {getLevels().map((l) => {
          const open = l.number <= user.currentLevel;
          const href = l.number === 0 ? "/profile/tutorial" : `/profile/levels/${l.slug}`;
          return (
            <li key={l.number} className="card">
              <h3>
                <Swatch level={l} />
                {open ? <Link href={href}>{levelLabel(l)}</Link> : levelLabel(l)}
              </h3>
              <div className="meta">
                {l.number === working ? <span>You are working here</span> : null}
                {!open ? <span>Opens when you move on</span> : null}
                {l.status === "in-preparation" ? <span>In preparation</span> : null}
              </div>
              {open && l.number !== working ? (
                <form action={focus}>
                  <input type="hidden" name="level" value={l.number} />
                  <button type="submit" className="link">
                    Work in this level
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
