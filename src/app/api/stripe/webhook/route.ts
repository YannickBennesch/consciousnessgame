import { NextResponse, type NextRequest } from "next/server";
import { handleStripeWebhook } from "@/lib/shop";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  try {
    const result = await handleStripeWebhook(raw, req.headers.get("stripe-signature"));
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error("[stripe webhook]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
