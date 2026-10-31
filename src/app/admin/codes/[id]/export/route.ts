import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { batchCsv, batchZip } from "@/lib/codes";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user?.roles.includes("ADMIN")) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  if (req.nextUrl.searchParams.get("format") === "zip") {
    const zip = await batchZip(id);
    return new NextResponse(new Uint8Array(zip), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="codes-${id}.zip"` },
    });
  }
  return new NextResponse(await batchCsv(id), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="codes-${id}.csv"` },
  });
}
