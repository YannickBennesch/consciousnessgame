import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Sharing } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLevels } from "@/lib/content";
import { setSharing, updateQuest } from "@/lib/quests";
import { str } from "@/lib/request";
import { QuestFields, questFromForm } from "@/components/quest-form";
import { Notice } from "@/components/ui";

async function save(form: FormData) {
  "use server";
  const user = await requireUser();
  const id = str(form, "id");
  const data = questFromForm(form);
  if (data.level > user.currentLevel) redirect(`/profile/quests/${id}?error=fields`);
  try {
    await updateQuest(user.id, id, data);
  } catch {
    redirect(`/profile/quests/${id}?error=fields`);
  }
  redirect(`/profile/quests/${id}?saved=1`);
}

async function share(form: FormData) {
  "use server";
  const user = await requireUser();
  const id = str(form, "id");
  const res = await setSharing(user.id, id, str(form, "sharing") as Sharing, { acknowledgedLimit: str(form, "ack") === "1" });
  redirect(`/profile/quests/${id}?${res.ok ? "shared=1" : `share=${res.reason}`}`);
}

export default async function QuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const quest = await db.playerQuest.findFirst({ where: { id: (await params).id, authorId: user.id } });
  if (!quest) notFound();
  const levels = getLevels().filter((l) => l.number <= user.currentLevel && l.topics.length > 0);
  const ref = `player:${quest.id}`;

  return (
    <>
      <p className="ui small">
        <Link href="/profile/quests">My quests</Link>
      </p>
      <h1>{quest.title}</h1>
      {sp.created || sp.saved ? (
        <Notice role="status">
          <p>Saved.</p>
        </Notice>
      ) : null}
      <p className="ui">
        <Link href={`/profile/item?ref=${encodeURIComponent(ref)}`}>Play it</Link>
        {quest.testedAt ? null : <span className="muted"> · Play it and mark it complete yourself before you share it.</span>}
      </p>

      <h2>Sharing</h2>
      {sp.share === "not-tested" ? (
        <Notice role="status">
          <p>Before you share it, play it yourself and mark it complete with your inner referee.</p>
        </Notice>
      ) : null}
      {sp.share === "phase-2" ? (
        <Notice role="status">
          <p>Sharing with a circle of trust arrives together with pair and circle play.</p>
        </Notice>
      ) : null}
      {sp.share === "soft-limit" ? (
        <Notice role="status">
          <p>
            To leave time for real testing, players share about one new public quest per month. You have shared one recently.
            You can still share this one if it is ready.
          </p>
          <form action={share}>
            <input type="hidden" name="id" value={quest.id} />
            <input type="hidden" name="sharing" value="PUBLIC" />
            <input type="hidden" name="ack" value="1" />
            <button type="submit" className="secondary">
              Share it anyway
            </button>
          </form>
        </Notice>
      ) : null}
      {quest.kind === "CORE" ? (
        <p>This quest has been accepted as a core quest of the game.</p>
      ) : (
        <form action={share}>
          <input type="hidden" name="id" value={quest.id} />
          <fieldset>
            <legend>Who can see this quest</legend>
            {(
              [
                ["PRIVATE", "Private", "Only you."],
                ["CIRCLE", "Circle of trust", "Chosen players, a pair partner or your circle. Arrives with circle play."],
                ["PUBLIC", "Public", "All players who have made themselves visible, without your name."],
              ] as const
            ).map(([v, label, hint]) => (
              <label key={v} className="choice">
                <input type="radio" name="sharing" value={v} defaultChecked={quest.sharing === v} disabled={v === "CIRCLE"} />
                <span>
                  {label}
                  <span className="hint">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {user.visibility === "PRIVATE" ? (
            <p className="hint ui">You are private at the moment, so a public quest stays hidden until you become visible.</p>
          ) : null}
          <div className="actions">
            <button type="submit" className="secondary">
              Save sharing
            </button>
          </div>
        </form>
      )}

      {quest.kind === "COMMUNITY" ? (
        <>
          <h2>Edit</h2>
          {sp.error ? (
            <Notice role="alert">
              <p>Please check the fields.</p>
            </Notice>
          ) : null}
          <form action={save}>
            <input type="hidden" name="id" value={quest.id} />
            <QuestFields quest={quest} levels={levels} />
            <div className="actions">
              <button type="submit">Save changes</button>
            </div>
          </form>
        </>
      ) : null}
    </>
  );
}
