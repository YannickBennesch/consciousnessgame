import { beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { handleStripeWebhook } from "@/lib/shop";
import { makeUser, outbox, resetDb } from "./helpers";

const stripe = new Stripe("sk_test_dummy");
const SECRET = "whsec_test_dummy";

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { payload, header: stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

async function pendingOrder() {
  const product = await db.product.create({
    data: { slug: "tee", name: "Tutorial T-shirt", type: "TSHIRT", series: "tutorial-bw", description: "" },
  });
  const variant = await db.variant.create({ data: { productId: product.id, size: "M", priceCents: 3500 } });
  return db.order.create({
    data: { stripeSessionId: "cs_test_1", totalCents: 3500, items: { create: [{ variantId: variant.id, quantity: 1, priceCents: 3500 }] } },
  });
}

function completedEvent(orderId: string) {
  return {
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 3500,
        payment_intent: "pi_1",
        metadata: { orderId },
        customer_details: { email: "buyer@example.test", name: "B. Uyer", address: null },
        collected_information: {
          shipping_details: {
            name: "B. Uyer",
            address: { line1: "Rua 1", line2: null, city: "Lisboa", postal_code: "1000-001", country: "PT", state: null },
          },
        },
      },
    },
  };
}

describe("stripe webhook", () => {
  beforeEach(resetDb);

  it("rejects a bad signature", async () => {
    const { payload } = signed(completedEvent("x"));
    await expect(handleStripeWebhook(payload, "t=1,v1=bad")).rejects.toThrow();
  });

  it("marks the order paid, stores shipping, sends a confirmation, and changes no player account", async () => {
    const player = await makeUser({ currentLevel: 1, visibility: "VISIBLE" });
    const before = await db.user.findMany({ orderBy: { id: "asc" } });
    const order = await pendingOrder();

    const { payload, header } = signed(completedEvent(order.id));
    expect(await handleStripeWebhook(payload, header)).toEqual({ handled: "checkout.session.completed", changed: true });

    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid).toMatchObject({ status: "PAID", email: "buyer@example.test", shippingName: "B. Uyer", paymentIntentId: "pi_1" });
    expect((paid.shippingAddress as { city: string }).city).toBe("Lisboa");
    expect(outbox.map((m) => m.to)).toEqual(["buyer@example.test"]);

    // A shop purchase never creates an account and never changes game state.
    expect(await db.user.findMany({ orderBy: { id: "asc" } })).toEqual(before);
    expect(await db.user.findUnique({ where: { email: "buyer@example.test" } })).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: player.id } })).currentLevel).toBe(1);
  });

  it("is idempotent when Stripe retries", async () => {
    const order = await pendingOrder();
    const { payload, header } = signed(completedEvent(order.id));
    await handleStripeWebhook(payload, header);
    expect(await handleStripeWebhook(payload, header)).toEqual({ handled: "checkout.session.completed", changed: false });
    expect(outbox).toHaveLength(1);
  });

  it("marks refunded orders", async () => {
    const order = await pendingOrder();
    const done = signed(completedEvent(order.id));
    await handleStripeWebhook(done.payload, done.header);
    const refund = signed({
      id: "evt_2",
      object: "event",
      type: "charge.refunded",
      data: { object: { id: "ch_1", object: "charge", payment_intent: "pi_1", refunded: true } },
    });
    await handleStripeWebhook(refund.payload, refund.header);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
  });
});
