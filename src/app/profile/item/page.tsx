import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { FORM_LABELS, getLevel } from "@/lib/content";
import { getProgress, isCompletable, OPEN_MESSAGE, REFEREE_QUESTIONS } from "@/lib/game";
import { getT } from "@/lib/i18n";
import { accentStyle, fmtDate, levelLabel, Notice } from "@/components/ui";
import { EntryFields, VisibilityField } from "@/components/entry-fields";
import { SensitiveNotice } from "@/components/support";
import { canUseItem } from "./access";
import { answerReferee, changeStatus, completeWithEntry, logSession, saveThresholdLetter, tickStage } from "./actions";

const ANSWER_LABEL = { YES: "Yes", NOT_YET: "Not yet", YES_WITH_CONDITIONS: "Yes, with conditions" } as const;

export default async function ItemPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const ref = sp.ref ?? "";
  const item = await canUseItem(user, ref);
  if (!item) notFound();
  const t = await getT("status");
  const level = getLevel(item.level)!;
  const progress = await getProgress(user.id, ref);
  const status = progress?.status ?? "NOT_STARTED";
  const topicTitle = (id: string) => level.topics.find((t) => t.id === id)?.title ?? id;
  const completable = isCompletable(item.form);
  const letters = item.thresholdLetter
    ? await db.logEntry.findMany({ where: { userId: user.id, itemRef: ref, kind: "THRESHOLD_LETTER" }, orderBy: { createdAt: "desc" } })
    : [];
  const sessions = !completable ? await db.logEntry.count({ where: { userId: user.id, itemRef: ref, kind: "EXERCISE_SESSION" } }) : 0;
  const visibleAllowed = user.visibility === "VISIBLE";
  const hiddenRef = <input type="hidden" name="ref" value={ref} />;

  return (
    <div className="level-band" style={accentStyle(level)}>
      <p className="ui small">
        <Link href={item.level === 0 ? "/profile/tutorial" : `/profile/levels/${level.slug}`}>{levelLabel(level)}</Link>
        {item.playerQuestId && item.authorId === user.id ? (
          <>
            {" "}
            · <Link href={`/profile/quests/${item.playerQuestId}`}>Edit my quest</Link>
          </>
        ) : null}
      </p>
      <h1>{item.title}</h1>
      {item.sensitive ? <SensitiveNotice /> : null}

      <dl className="meta" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 1rem" }}>
        <dt>Form</dt>
        <dd style={{ margin: 0 }}>{FORM_LABELS[item.form]}</dd>
        <dt>Topic{item.topicIds.length > 1 ? "s" : ""}</dt>
        <dd style={{ margin: 0 }}>{item.topicIds.map(topicTitle).join("; ")}</dd>
        <dt>Duration</dt>
        <dd style={{ margin: 0 }}>{item.duration}</dd>
      </dl>

      {item.description ? <div className="prose">{item.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div> : null}

      {item.stages.length > 0 ? (
        <section id="stages" aria-labelledby="stages-h">
          <h2 id="stages-h">Stages</h2>
          <ul className="cards">
            {item.stages.map((s, i) => {
              const done = progress?.stagesDone.includes(i) ?? false;
              return (
                <li key={i} className="card">
                  <form action={tickStage} className="choice" style={{ alignItems: "flex-start" }}>
                    {hiddenRef}
                    <input type="hidden" name="stage" value={i} />
                    <button type="submit" className="secondary" aria-pressed={done} style={{ minWidth: "6.5rem" }}>
                      {done ? "✓ Done" : "Mark done"}
                    </button>
                    <span>{s}</span>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {item.completeWhen ? (
        <p>
          <strong>Complete when:</strong> {item.completeWhen}
        </p>
      ) : null}
      {item.pairVariant ? (
        <p>
          <strong>Pair variant:</strong> {item.pairVariant}
        </p>
      ) : null}
      {item.circleVariant ? (
        <p>
          <strong>Circle variant:</strong> {item.circleVariant}
        </p>
      ) : null}

      {sp.done ? (
        <Notice role="status">
          <p>Recorded in your log. This is now marked complete.</p>
        </Notice>
      ) : null}
      {sp.logged ? (
        <Notice role="status">
          <p>Session recorded in your log.</p>
        </Notice>
      ) : null}

      {completable ? (
        <section aria-labelledby="status-h">
          <h2 id="status-h">Status: {t(status)}</h2>
          {status !== "COMPLETE" ? (
            <form action={changeStatus} className="actions">
              {hiddenRef}
              {status !== "IN_PROGRESS" ? (
                <button type="submit" name="status" value="IN_PROGRESS" className="secondary">
                  {status === "POSTPONED" ? "Take it up again" : "Start"}
                </button>
              ) : null}
              {status !== "POSTPONED" ? (
                <button type="submit" name="status" value="POSTPONED" className="secondary">
                  Postpone
                </button>
              ) : null}
            </form>
          ) : (
            <form action={changeStatus} className="actions">
              {hiddenRef}
              <button type="submit" name="status" value="IN_PROGRESS" className="secondary">
                Play it again
              </button>
            </form>
          )}

          {status !== "COMPLETE" ? (
            <section id="referee" aria-labelledby="referee-h">
              <h2 id="referee-h">The inner referee</h2>
              {sp.referee === "open" ? (
                <Notice role="status">
                  <p>{OPEN_MESSAGE}</p>
                </Notice>
              ) : null}
              {sp.referee === "entry" ? (
                <form action={completeWithEntry}>
                  {hiddenRef}
                  {["q1", "q2", "q3"].map((q) => (
                    <input key={q} type="hidden" name={q} value="yes" />
                  ))}
                  <p>You answered yes to all three questions. Write your log entry to mark this complete.</p>
                  <EntryFields visibleAllowed={visibleAllowed} />
                  <div className="actions">
                    <button type="submit">Save entry and mark complete</button>
                    <Link href={`/profile/item?ref=${encodeURIComponent(ref)}`}>Not now</Link>
                  </div>
                </form>
              ) : (
                <form action={answerReferee}>
                  {hiddenRef}
                  <p>Only you decide whether this is complete. Answer each question honestly.</p>
                  {REFEREE_QUESTIONS.map((q, i) => (
                    <fieldset key={i}>
                      <legend>{q}</legend>
                      <label className="choice">
                        <input type="radio" name={`q${i + 1}`} value="yes" required />
                        <span>Yes</span>
                      </label>
                      <label className="choice">
                        <input type="radio" name={`q${i + 1}`} value="not-yet" />
                        <span>Not yet</span>
                      </label>
                    </fieldset>
                  ))}
                  <div className="actions">
                    <button type="submit">Continue</button>
                  </div>
                </form>
              )}
            </section>
          ) : null}
        </section>
      ) : (
        <section aria-labelledby="session-h">
          <h2 id="session-h">Log a session</h2>
          <p className="muted ui small">
            An exercise has no completion state. It can be done once, daily, or whenever it is needed.
            {sessions > 0 ? ` Sessions in your log: ${sessions}.` : ""}
          </p>
          <form action={logSession}>
            {hiddenRef}
            <EntryFields visibleAllowed={visibleAllowed} />
            <div className="actions">
              <button type="submit">Save session</button>
            </div>
          </form>
        </section>
      )}

      {item.thresholdLetter ? (
        <section id="letter" aria-labelledby="letter-h">
          <h2 id="letter-h">Threshold letter</h2>
          {sp.letter ? (
            <Notice role="status">
              <p>Your letter is saved in your log.</p>
            </Notice>
          ) : null}
          <form action={saveThresholdLetter}>
            {hiddenRef}
            <label htmlFor="letter-text">Do I choose to be here, in this body, on this earth?</label>
            <textarea id="letter-text" name="letter" required />
            <fieldset>
              <legend>My answer</legend>
              {(Object.keys(ANSWER_LABEL) as (keyof typeof ANSWER_LABEL)[]).map((a) => (
                <label key={a} className="choice">
                  <input type="radio" name="answer" value={a} required />
                  <span>{ANSWER_LABEL[a]}</span>
                </label>
              ))}
              <span className="hint">All are honest answers. Only a yes opens the transition to the next level.</span>
            </fieldset>
            <VisibilityField visibleAllowed={visibleAllowed} />
            <div className="actions">
              <button type="submit">Save letter</button>
            </div>
          </form>
          {letters.length > 0 ? (
            <>
              <h3>My letters</h3>
              <ul className="cards">
                {letters.map((l) => (
                  <li key={l.id} className="card">
                    <div className="meta">
                      <span>{fmtDate(l.createdAt)}</span>
                      <span>{ANSWER_LABEL[l.thresholdAnswer!]}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section id="support" className="notice">
        <p>
          <Link href={`/support?item=${encodeURIComponent(ref)}#form`}>This touches something I can’t carry alone</Link>
        </p>
      </section>
    </div>
  );
}
