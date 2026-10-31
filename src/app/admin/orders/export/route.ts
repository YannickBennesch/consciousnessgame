import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ordersCsv } from "@/lib/shop";

export async function GET() {
  const user = await currentUser();
  if (!user?.roles.includes("ADMIN")) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(await ordersCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
