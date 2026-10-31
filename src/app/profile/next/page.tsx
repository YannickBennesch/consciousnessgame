import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getLevel } from "@/lib/content";
import { moveToNextLevel, transitionConditions, TUTORIAL_STATEMENT } from "@/lib/game";
import { str } from "@/lib/request";
import { accentStyle, levelLabel, Notice } from "@/components/ui";

async function move(form: FormData) {
  "use server";
  const user = await requireUser();
  const res = await moveToNextLevel(user.id, {
    fromLevel: Number(str(form, "from")),
    statementConfirmed: str(form, "statement") === "on",
    readyTick: str(form, "ready") === "on",
  });
  revalidatePath("/profile", "layout");
  if (res.ok) redirect(res.toLevel === 1 ? "/profile/levels/red?arrived=1" : `/profile/levels/${getLevel(res.toLevel)!.slug}`);
  redirect(`/profile/next?reason=${res.reason}`);
}

const REASONS: Record<string, string> = {
  statement: "The statement needs your confirmation.",
  threshold: "The Threshold Quest of this level is still open.",
  letter: "The transition opens with a threshold letter answered “yes”.",
  ready: "The third condition is your own tick.",
  topics: "Every topic needs at least one challenge or quest in your log first.",
  "not-current": "This page was out of date. Please look again.",
};

export default async function NextLevel({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const user = await requireUser();
  const { reason } = await searchParams;
  const from = getLevel(user.currentLevel)!;
  const to = getLevel(user.currentLevel + 1);
  if (!to) {
    return (
      <>
        <h1>The infinity level</h1>
        <p>Level 8 is mastered with the realisation that the game is infinite.</p>
      </>
    );
  }
  const c = await transitionConditions(user.id, user.currentLevel);

  return (
    <div className="level-band" style={accentStyle(to)}>
      <h1>
        From {levelLabel(from)} to {levelLabel(to)}
      </h1>
      {reason ? (
        <Notice role="status">
          <p>{REASONS[reason] ?? "Not yet."}</p>
        </Notice>
      ) : null}
      {c.kind === "tutorial" ? (
        <form action={move}>
          <input type="hidden" name="from" value={0} />
          <p>No one outside you decides when you are ready for Level 1.</p>
          <label className="choice">
            <input type="checkbox" name="statement" required />
            <span>{TUTORIAL_STATEMENT}</span>
          </label>
          <div className="actions">
            <button type="submit">Open Level 1</button>
            <Link href="/profile/tutorial">Not yet</Link>
          </div>
        </form>
      ) : (
        <form action={move}>
          <input type="hidden" name="from" value={user.currentLevel} />
          <ol>
            <li>
              <p>
                <strong>Every topic of the level has at least one challenge or quest in the log.</strong>
              </p>
              {c.topicsCovered ? (
                <p>All topics have an entry.</p>
              ) : (
                <>
                  <p>
                    Topics without a challenge or quest in your log yet:{" "}
                    {c.topicGaps.map((t) => t.title).join("; ")}.
                  </p>
                  <p className="muted small ui">
                    {c.topicLock
                      ? "These need an entry before you move on."
                      : "This is information for you. Your inner referee decides."}
                  </p>
                </>
              )}
            </li>
            <li>
              <p>
                <strong>The Threshold Quest is complete.</strong>
              </p>
              {c.threshold ? (
                <p>
                  <Link href={`/profile/item?ref=${encodeURIComponent(c.threshold.ref)}`}>{c.threshold.title}</Link>:{" "}
                  {c.threshold.complete ? "complete." : "still open."}
                </p>
              ) : (
                <p className="muted">This level’s Threshold Quest is in preparation.</p>
              )}
              {c.letterRequired ? (
                <p>
                  Threshold letter:{" "}
                  {c.letterAnswer === "YES"
                    ? "yes."
                    : c.letterAnswer
                      ? "written. Only a yes opens the transition."
                      : "not written yet."}
                </p>
              ) : null}
            </li>
            <li>
              <label className="choice">
                <input type="checkbox" name="ready" />
                <span>
                  <strong>My inner referee confirms that I am ready.</strong>
                </span>
              </label>
            </li>
          </ol>
          <div className="actions">
            <button type="submit">Move to {levelLabel(to)}</button>
          </div>
        </form>
      )}
    </div>
  );
}
