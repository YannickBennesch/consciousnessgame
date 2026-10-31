import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { allSettings, setSetting } from "@/lib/settings";
import { str } from "@/lib/request";

async function save(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const threshold = Math.max(1, Math.round(Number(str(form, "reviewThreshold"))));
  const perMonth = Math.max(0, Math.round(Number(str(form, "publicQuestsPerMonth"))));
  if (Number.isFinite(threshold)) await setSetting("reviewThreshold", threshold);
  if (Number.isFinite(perMonth)) await setSetting("publicQuestsPerMonth", perMonth);
  await setSetting("transitionTopicLock", str(form, "transitionTopicLock") === "on");
  revalidatePath("/admin/settings");
}

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const s = await allSettings();
  return (
    <>
      <h1>Game settings</h1>
      <p className="ui small muted">These are the outline’s starting values, not fixed rules.</p>
      <form action={save}>
        <label htmlFor="reviewThreshold">
          Completions before a community quest is eligible for review
          <span className="hint">From different circles. Default 10.</span>
        </label>
        <input id="reviewThreshold" name="reviewThreshold" type="number" min={1} defaultValue={s.reviewThreshold} />
        <label htmlFor="publicQuestsPerMonth">
          New public quests per player per month before the gentle notice
          <span className="hint">Default 1. Circle-of-trust sharing has no limit.</span>
        </label>
        <input id="publicQuestsPerMonth" name="publicQuestsPerMonth" type="number" min={0} defaultValue={s.publicQuestsPerMonth} />
        <label className="choice">
          <input type="checkbox" name="transitionTopicLock" defaultChecked={s.transitionTopicLock} />
          <span>
            Require every topic of a level in the log before moving on (open decision O-1)
            <span className="hint">Off by default: the gaps are shown as information and the inner referee decides.</span>
          </span>
        </label>
        <div className="actions">
          <button type="submit">Save</button>
        </div>
      </form>
    </>
  );
}
