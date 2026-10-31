import type { PlayerQuest } from "@prisma/client";
import { FORM_LABELS, FORM_RULES, FORMS, type Level } from "@/lib/content";
import { levelLabel } from "./ui";

export function QuestFields({ quest, levels }: { quest?: PlayerQuest; levels: Level[] }) {
  const forms = FORMS.filter((f) => f !== "threshold-quest");
  return (
    <>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" type="text" required defaultValue={quest?.title} maxLength={140} />

      <label htmlFor="level">Level</label>
      <select id="level" name="level" defaultValue={quest?.level ?? levels.at(-1)?.number}>
        {levels.map((l) => (
          <option key={l.number} value={l.number}>
            {levelLabel(l)}
          </option>
        ))}
      </select>

      {levels.map((l) => (
        <fieldset key={l.number}>
          <legend>Topics, if the level is {levelLabel(l)}</legend>
          {l.topics.map((t) => (
            <label key={t.id} className="choice">
              <input type="checkbox" name="topicIds" value={t.id} defaultChecked={quest?.topicIds.includes(t.id)} />
              <span>{t.title}</span>
            </label>
          ))}
        </fieldset>
      ))}

      <fieldset>
        <legend>Form</legend>
        {forms.map((f) => (
          <label key={f} className="choice">
            <input type="radio" name="form" value={f} required defaultChecked={quest?.form === f} />
            <span>
              {FORM_LABELS[f]}
              <span className="hint">{FORM_RULES[f]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label htmlFor="duration">
        Duration <span className="hint">For example “7 days” or “3 weeks”.</span>
      </label>
      <input id="duration" name="duration" type="text" required defaultValue={quest?.duration} maxLength={80} />

      <label htmlFor="description">What the player does</label>
      <textarea id="description" name="description" required defaultValue={quest?.description} />

      <label htmlFor="stages">
        Stages (optional) <span className="hint">One stage per line.</span>
      </label>
      <textarea id="stages" name="stages" defaultValue={quest?.stages.join("\n")} />

      <label htmlFor="completeWhen">Complete when</label>
      <textarea id="completeWhen" name="completeWhen" required defaultValue={quest?.completeWhen} />

      <label className="choice">
        <input type="checkbox" name="sensitive" defaultChecked={quest?.sensitive} />
        <span>
          This touches a difficult theme (for example mortality, grief or survival fears)
          <span className="hint">Players will see that they may postpone it for as long as they need.</span>
        </span>
      </label>
      <label className="choice">
        <input type="checkbox" name="creditAuthor" defaultChecked={quest?.creditAuthor} />
        <span>
          If this is ever accepted as a core quest, I agree to be credited as its author
          <span className="hint">Reviewers do not see who wrote a quest while they review it.</span>
        </span>
      </label>
    </>
  );
}

export function questFromForm(form: FormData) {
  const level = Number(form.get("level"));
  return {
    title: form.get("title"),
    level,
    topicIds: form.getAll("topicIds"),
    form: form.get("form"),
    duration: form.get("duration"),
    description: form.get("description"),
    stages: String(form.get("stages") ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    completeWhen: form.get("completeWhen"),
    sensitive: form.get("sensitive") === "on",
    creditAuthor: form.get("creditAuthor") === "on",
  };
}
