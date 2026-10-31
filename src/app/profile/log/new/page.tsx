import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getLevels } from "@/lib/content";
import { createFreeEntry } from "@/lib/game";
import { str } from "@/lib/request";
import { EntryFields } from "@/components/entry-fields";
import { levelLabel } from "@/components/ui";

async function create(form: FormData) {
  "use server";
  const user = await requireUser();
  const level = Math.min(Number(str(form, "level")), user.currentLevel);
  await createFreeEntry(user.id, level, {
    did: str(form, "did"),
    changed: str(form, "changed"),
    refereeSaid: str(form, "refereeSaid"),
    visibility: str(form, "visibility") === "VISIBLE" ? "VISIBLE" : "PRIVATE",
    date: str(form, "date") ? new Date(str(form, "date")) : undefined,
    topicIds: form.getAll("topics").filter((v): v is string => typeof v === "string"),
  });
  revalidatePath("/profile", "layout");
  redirect("/profile/log");
}

export default async function NewEntry() {
  const user = await requireUser();
  const levels = getLevels().filter((l) => l.number <= user.currentLevel);
  const working = user.focusLevel ?? user.currentLevel;
  return (
    <>
      <h1>New log entry</h1>
      <form action={create}>
        <label htmlFor="level">Level</label>
        <select id="level" name="level" defaultValue={working}>
          {levels.map((l) => (
            <option key={l.number} value={l.number}>
              {levelLabel(l)}
            </option>
          ))}
        </select>
        {levels
          .filter((l) => l.topics.length > 0)
          .map((l) => (
            <fieldset key={l.number}>
              <legend>Topics of {levelLabel(l)} (optional)</legend>
              {l.topics.map((t) => (
                <label key={t.id} className="choice">
                  <input type="checkbox" name="topics" value={t.id} />
                  <span>{t.title}</span>
                </label>
              ))}
            </fieldset>
          ))}
        <EntryFields visibleAllowed={user.visibility === "VISIBLE"} />
        <div className="actions">
          <button type="submit">Save entry</button>
        </div>
      </form>
    </>
  );
}
