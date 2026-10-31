import Stripe from "stripe";
import type { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { sendMail } from "./email";

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function formatPrice(cents: number, currency = "eur") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export const CartInput = z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(10) })).min(1);

/**
 * Creates a PENDING order and a Stripe Checkout session.
 * A purchase never creates a player account and never changes game state (§11.2).
 */
export async function createCheckout(raw: unknown): Promise<{ url: string; orderId: string }> {
  const cart = CartInput.parse(raw);
  const variants = await db.variant.findMany({
    where: { id: { in: cart.map((c) => c.variantId) }, active: true, product: { listed: true, comingSoon: false } },
    include: { product: true },
  });
  if (variants.length !== cart.length) throw new Error("A selected item is not available");
  const lines = cart.map((c) => ({ ...c, variant: variants.find((v) => v.id === c.variantId)! }));
  const currency = lines[0].variant.currency;
  const total = lines.reduce((s, l) => s + l.variant.priceCents * l.quantity, 0);

  const order = await db.order.create({
    data: {
      totalCents: total,
      currency,
      items: { create: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, priceCents: l.variant.priceCents })) },
    },
  });

  const countries = (process.env.SHIP_COUNTRIES ?? "DE,PT").split(",").map((s) => s.trim()) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    // Payment methods follow the Stripe dashboard settings (cards, SEPA, MB WAY, Multibanco if enabled).
    line_items: lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency,
        unit_amount: l.variant.priceCents,
        product_data: { name: `${l.variant.product.name} (${l.variant.size}${l.variant.cut ? `, ${l.variant.cut}` : ""})` },
        tax_behavior: process.env.VAT_MODE === "stripe_tax" ? "inclusive" : undefined,
      },
    })),
    automatic_tax: { enabled: process.env.VAT_MODE === "stripe_tax" },
    shipping_address_collection: { allowed_countries: countries },
    metadata: { orderId: order.id },
    success_url: `${appUrl()}/shop/thanks?order=${order.id}`,
    cancel_url: `${appUrl()}/shop`,
  });
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return { url: session.url!, orderId: order.id };
}

/** Stripe webhook. Verifies the signature, then updates only shop tables. */
export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new Error("Missing webhook secret or signature");
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return { handled: event.type, changed: false };
    const orderId = s.metadata?.orderId;
    if (!orderId) return { handled: event.type, changed: false };
    const shipping =
      (s as unknown as { collected_information?: { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails } })
        .collected_information?.shipping_details ?? null;
    // Idempotent: only PENDING orders move to PAID.
    const updated = await db.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        status: "PAID",
        email: s.customer_details?.email ?? null,
        shippingName: shipping?.name ?? s.customer_details?.name ?? null,
        shippingAddress: (shipping?.address ?? s.customer_details?.address ?? undefined) as object | undefined,
        paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : null,
        totalCents: s.amount_total ?? undefined,
      },
    });
    if (updated.count === 1 && s.customer_details?.email) {
      await sendMail({
        to: s.customer_details.email,
        subject: "Your order",
        text: [
          "Thank you. Your order is confirmed.",
          `Order: ${orderId}`,
          "",
          "Each piece carries a patch with a QR code and a player code.",
          "The first black-and-white piece is the entry to the game. Everything after that is free.",
          "Later pieces are optional and do not move anyone forward in the game.",
        ].join("\n"),
      });
    }
    return { handled: event.type, changed: updated.count === 1 };
  }

  if (event.type === "checkout.session.expired") {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.metadata?.orderId;
    if (orderId) await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    return { handled: event.type, changed: true };
  }

  if (event.type === "charge.refunded") {
    const c = event.data.object as Stripe.Charge;
    if (typeof c.payment_intent === "string" && c.refunded) {
      await db.order.updateMany({ where: { paymentIntentId: c.payment_intent }, data: { status: "REFUNDED" } });
    }
    return { handled: event.type, changed: true };
  }

  return { handled: null, changed: false };
}

export async function setOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string) {
  const order = await db.order.update({
    where: { id: orderId },
    data: { status, trackingNumber: trackingNumber === undefined ? undefined : trackingNumber || null },
  });
  if (status === "SHIPPED" && order.email) {
    await sendMail({
      to: order.email,
      subject: "Your order is on its way",
      text: `Your order ${order.id} has been shipped.${order.trackingNumber ? `\nTracking number: ${order.trackingNumber}` : ""}`,
    });
  }
  return order;
}

/** CSV for the person who prints and ships. Contains shipping data; admin only. */
export async function ordersCsv(): Promise<string> {
  const orders = await db.order.findMany({
    where: { status: { in: ["PAID", "IN_PRODUCTION", "SHIPPED"] } },
    include: { items: { include: { variant: { include: { product: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) => {
    const a = (o.shippingAddress ?? {}) as Record<string, string | null>;
    const items = o.items.map((i) => `${i.quantity}x ${i.variant.product.name} ${i.variant.size}${i.variant.cut ? ` ${i.variant.cut}` : ""}`);
    return [o.id, o.createdAt.toISOString(), o.status, o.shippingName, a.line1, a.line2, a.postal_code, a.city, a.state, a.country, items.join("; "), o.trackingNumber]
      .map(esc)
      .join(",");
  });
  return ["order,date,status,name,line1,line2,postal_code,city,state,country,items,tracking", ...rows].join("\n") + "\n";
}
