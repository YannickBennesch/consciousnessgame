import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { exportAsHtml, exportUserData } from "@/lib/account";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  const data = await exportUserData(user.id);
  const headers = { "Cache-Control": "no-store" };
  if (req.nextUrl.searchParams.get("format") === "html") {
    return new NextResponse(exportAsHtml(data), { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-game-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
