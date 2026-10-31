import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatCode } from "@/lib/codes";
import { fmtDate } from "@/components/ui";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const batch = await db.codeBatch.findUnique({ where: { id: (await params).id } });
  if (!batch) notFound();
  // Status and activation date only. No player identity in this list (§4).
  const codes = await db.playerCode.findMany({
    where: { batchId: batch.id },
    select: { code: true, status: true, activatedAt: true },
    orderBy: { code: "asc" },
  });
  return (
    <>
      <p className="ui small">
        <Link href="/admin/codes">Code batches</Link>
      </p>
      <h1>
        Batch {batch.series} · {fmtDate(batch.createdAt)}
      </h1>
      <p className="ui">
        <a href={`/admin/codes/${batch.id}/export?format=csv`}>Download CSV</a> ·{" "}
        <a href={`/admin/codes/${batch.id}/export?format=zip`}>Download QR codes (ZIP of SVGs)</a>
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Status</th>
              <th scope="col">Activated</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code}>
                <td>
                  <code>{formatCode(c.code)}</code>
                </td>
                <td>{c.status.toLowerCase()}</td>
                <td>{c.activatedAt ? fmtDate(c.activatedAt) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
