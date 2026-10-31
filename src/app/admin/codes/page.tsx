import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createBatch } from "@/lib/codes";
import { str } from "@/lib/request";
import { fmtDate } from "@/components/ui";

async function create(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const batch = await createBatch(str(form, "series").trim() || "tutorial-bw", Number(str(form, "count")), str(form, "note"));
  redirect(`/admin/codes/${batch.id}`);
}

export default async function CodesPage() {
  await requireRole("ADMIN");
  const batches = await db.codeBatch.findMany({ orderBy: { createdAt: "desc" } });
  const counts = await db.playerCode.groupBy({ by: ["batchId", "status"], _count: true });
  const count = (id: string, s: string) => counts.find((c) => c.batchId === id && c.status === s)?._count ?? 0;
  return (
    <>
      <h1>Code batches</h1>
      <form action={create}>
        <label htmlFor="series">
          Series <span className="hint">For example tutorial-bw or red.</span>
        </label>
        <input id="series" name="series" type="text" defaultValue="tutorial-bw" required />
        <label htmlFor="count">Number of codes</label>
        <input id="count" name="count" type="number" min={1} max={5000} defaultValue={100} required />
        <label htmlFor="note">Note</label>
        <input id="note" name="note" type="text" />
        <div className="actions">
          <button type="submit">Generate batch</button>
        </div>
      </form>
      <h2>Batches</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Created</th>
              <th scope="col">Series</th>
              <th scope="col">Codes</th>
              <th scope="col">Unused</th>
              <th scope="col">Activated</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/admin/codes/${b.id}`}>{fmtDate(b.createdAt)}</Link>
                </td>
                <td>{b.series}</td>
                <td>{b.count}</td>
                <td>{count(b.id, "UNUSED")}</td>
                <td>{count(b.id, "ACTIVATED")}</td>
                <td>{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
