import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { str } from "@/lib/request";
import { Notice } from "@/components/ui";

const ROLES: Role[] = ["REVIEWER", "SUPPORT", "ADMIN"];

async function setRoles(form: FormData) {
  "use server";
  const me = await requireRole("ADMIN");
  const email = str(form, "email").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) redirect("/admin/roles?error=unknown");
  const roles: Role[] = ["PLAYER", ...ROLES.filter((r) => form.get(r) === "on")];
  if (user.id === me.id && !roles.includes("ADMIN")) redirect("/admin/roles?error=self");
  await db.user.update({ where: { id: user.id }, data: { roles } });
  redirect("/admin/roles?saved=1");
}

export default async function RolesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const staff = await db.user.findMany({
    where: { roles: { hasSome: ROLES } },
    select: { email: true, roles: true },
    orderBy: { email: "asc" },
  });
  return (
    <>
      <h1>Roles</h1>
      {sp.saved ? (
        <Notice role="status">
          <p>Saved.</p>
        </Notice>
      ) : null}
      {sp.error ? (
        <Notice role="alert">
          <p>{sp.error === "self" ? "You cannot remove your own admin role." : "No player with this e-mail address."}</p>
        </Notice>
      ) : null}
      <table>
        <thead>
          <tr>
            <th scope="col">E-mail</th>
            <th scope="col">Roles</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.email}>
              <td>{s.email}</td>
              <td>{s.roles.filter((r) => r !== "PLAYER").join(", ").toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Set roles for a player</h2>
      <form action={setRoles}>
        <label htmlFor="email">E-mail address of the player</label>
        <input id="email" name="email" type="email" required />
        <fieldset>
          <legend>Roles</legend>
          {ROLES.map((r) => (
            <label key={r} className="choice">
              <input type="checkbox" name={r} />
              <span>{r.toLowerCase()}</span>
            </label>
          ))}
        </fieldset>
        <div className="actions">
          <button type="submit">Save roles</button>
        </div>
      </form>
    </>
  );
}
