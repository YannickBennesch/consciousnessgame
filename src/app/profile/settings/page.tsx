import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, signOut } from "@/lib/auth";
import { deleteAccount, getPrivateDetails, savePrivateDetails } from "@/lib/account";
import { formatCode } from "@/lib/codes";
import { str } from "@/lib/request";
import { fmtDate, Notice } from "@/components/ui";

async function saveVisibility(form: FormData) {
  "use server";
  const user = await requireUser();
  const visibility = str(form, "visibility") === "VISIBLE" ? "VISIBLE" : "PRIVATE";
  const region = str(form, "region").trim().slice(0, 80) || null;
  await db.user.update({ where: { id: user.id }, data: { visibility, region } });
  revalidatePath("/profile", "layout");
  redirect("/profile/settings?saved=visibility");
}

async function saveDetails(form: FormData) {
  "use server";
  const user = await requireUser();
  await savePrivateDetails(user.id, {
    birthDate: str(form, "birthDate") || null,
    birthTime: str(form, "birthTime") || null,
    birthPlace: str(form, "birthPlace").slice(0, 120) || null,
  });
  redirect("/profile/settings?saved=details");
}

async function remove(form: FormData) {
  "use server";
  const user = await requireUser();
  if (str(form, "confirm").trim().toLowerCase() !== "delete") redirect("/profile/settings?error=confirm#delete");
  await deleteAccount(user.id);
  await signOut();
  redirect("/?deleted=1");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const codes = await db.playerCode.findMany({ where: { userId: user.id }, orderBy: { activatedAt: "asc" } });
  const details = await getPrivateDetails(user.id);

  return (
    <>
      <h1>Settings</h1>
      {sp.saved ? (
        <Notice role="status">
          <p>Saved.</p>
        </Notice>
      ) : null}

      <h2>E-mail</h2>
      <p className="ui">{user.email}</p>

      <h2>Player codes</h2>
      <ul className="ui">
        {codes.map((c) => (
          <li key={c.code}>
            <code>{formatCode(c.code)}</code> <span className="muted">· {c.series} · {c.activatedAt ? fmtDate(c.activatedAt) : ""}</span>
          </li>
        ))}
      </ul>
      <p className="hint ui">
        To add a code from another garment, enter it on <a href="/play">the code page</a> with this e-mail address. It is kept for
        remembrance and changes nothing in the game.
      </p>

      <h2>Visibility</h2>
      <form action={saveVisibility}>
        <fieldset>
          <legend>Who can see my shared entries and quests</legend>
          <label className="choice">
            <input type="radio" name="visibility" value="PRIVATE" defaultChecked={user.visibility === "PRIVATE"} />
            <span>
              Private
              <span className="hint">Nobody sees anything of mine, and I do not see other players’ entries or quests.</span>
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="visibility" value="VISIBLE" defaultChecked={user.visibility === "VISIBLE"} />
            <span>
              Visible
              <span className="hint">
                Other visible players see the entries and quests I mark as shared, and I see theirs. Each entry stays private
                unless I mark it otherwise.
              </span>
            </span>
          </label>
        </fieldset>
        <label htmlFor="region">
          City or region (optional)
          <span className="hint">For finding pair partners and circles later. Never derived from your connection.</span>
        </label>
        <input id="region" name="region" type="text" defaultValue={user.region ?? ""} autoComplete="address-level2" />
        <div className="actions">
          <button type="submit">Save</button>
        </div>
      </form>

      <h2>Private details</h2>
      <p className="ui small muted">Optional. Encrypted, visible only to you, never printed.</p>
      <form action={saveDetails}>
        <label htmlFor="birthDate">Birth date</label>
        <input id="birthDate" name="birthDate" type="date" defaultValue={details.birthDate ?? ""} autoComplete="off" />
        <label htmlFor="birthTime">Birth time</label>
        <input id="birthTime" name="birthTime" type="time" defaultValue={details.birthTime ?? ""} autoComplete="off" />
        <label htmlFor="birthPlace">Place of birth</label>
        <input id="birthPlace" name="birthPlace" type="text" defaultValue={details.birthPlace ?? ""} autoComplete="off" />
        <div className="actions">
          <button type="submit">Save details</button>
        </div>
      </form>

      <h2>My data</h2>
      <p className="ui">
        <a href="/profile/settings/export?format=json" download>
          Download everything (JSON)
        </a>{" "}
        · <a href="/profile/settings/export?format=html">Readable version (HTML)</a>
      </p>

      <h2 id="delete">Delete my account</h2>
      <p>
        This deletes your log, your quests, your private details and your account. Your player code is retired and never issued
        again. This cannot be undone.
      </p>
      {sp.error === "confirm" ? (
        <Notice role="alert">
          <p>Please type “delete” to confirm.</p>
        </Notice>
      ) : null}
      <form action={remove}>
        <label htmlFor="confirm">Type “delete” to confirm</label>
        <input id="confirm" name="confirm" type="text" autoComplete="off" />
        <div className="actions">
          <button type="submit" className="secondary">
            Delete my account
          </button>
        </div>
      </form>
    </>
  );
}
