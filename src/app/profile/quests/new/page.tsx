import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLevels } from "@/lib/content";
import { createQuest } from "@/lib/quests";
import { QuestFields, questFromForm } from "@/components/quest-form";
import { Notice } from "@/components/ui";

async function create(form: FormData) {
  "use server";
  const user = await requireUser();
  const data = questFromForm(form);
  if (data.level > user.currentLevel) redirect("/profile/quests/new?error=1");
  let id: string;
  try {
    id = (await createQuest(user.id, data)).id;
  } catch {
    redirect("/profile/quests/new?error=1");
  }
  redirect(`/profile/quests/${id}?created=1`);
}

export default async function NewQuest({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const levels = getLevels().filter((l) => l.number <= user.currentLevel && l.topics.length > 0);
  return (
    <>
      <h1>Design a challenge or quest</h1>
      {(await searchParams).error ? (
        <Notice role="alert">
          <p>Please check the fields: a title, at least one topic of the chosen level, a form, a duration, a description and a completion condition.</p>
        </Notice>
      ) : null}
      <form action={create}>
        <QuestFields levels={levels} />
        <div className="actions">
          <button type="submit">Save (private)</button>
        </div>
      </form>
    </>
  );
}
