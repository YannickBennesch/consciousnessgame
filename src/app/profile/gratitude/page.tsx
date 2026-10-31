import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { outlineSection, renderMarkdown } from "@/lib/content";
import { str } from "@/lib/request";
import { fmtDate, Html } from "@/components/ui";

async function add(form: FormData) {
  "use server";
  const user = await requireUser();
  const text = str(form, "text").trim();
  if (!text) return;
  await db.gratitudeNote.create({ data: { userId: user.id, text: text.slice(0, 5000) } });
  revalidatePath("/profile/gratitude");
}

export default async function GratitudePage() {
  const user = await requireUser();
  const notes = await db.gratitudeNote.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 60 });
  const section = outlineSection("The daily practice: gratitude");
  return (
    <>
      <h1>Gratitude</h1>
      {section ? (
        <details>
          <summary className="ui">About this practice</summary>
          <Html html={renderMarkdown(section.replace(/^## .*\n/, ""))} />
        </details>
      ) : null}
      <form action={add}>
        <label htmlFor="text">
          Today I am grateful for
          <span className="hint">Private. Only you can see these notes.</span>
        </label>
        <textarea id="text" name="text" required />
        <div className="actions">
          <button type="submit">Save</button>
        </div>
      </form>
      <ul className="cards">
        {notes.map((n) => (
          <li key={n.id} className="card">
            <div className="meta">{fmtDate(n.date)}</div>
            <p style={{ margin: "0.3rem 0 0", whiteSpace: "pre-wrap" }}>{n.text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
