import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatPrice, setOrderStatus } from "@/lib/shop";
import { formatCode, normalizeCode } from "@/lib/codes";
import { str } from "@/lib/request";
import { fmtDate } from "@/components/ui";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REFUNDED", "CANCELLED"];

async function update(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const id = str(form, "id");
  await setOrderStatus(id, str(form, "status") as OrderStatus, str(form, "tracking"));
  // Optional: record which patch code went into this order, for support cases.
  const code = normalizeCode(str(form, "code"));
  if (code) await db.playerCode.updateMany({ where: { code }, data: { orderId: id } });
  revalidatePath("/admin/orders");
}

export default async function OrdersPage() {
  await requireRole("ADMIN");
  const orders = await db.order.findMany({
    where: { status: { not: "PENDING" } },
    include: { items: { include: { variant: { include: { product: true } } } }, codes: { select: { code: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <h1>Orders</h1>
      <p className="ui">
        <a href="/admin/orders/export">Download CSV for printing and shipping</a>
      </p>
      <ul className="cards">
        {orders.map((o) => {
          const a = (o.shippingAddress ?? {}) as Record<string, string | null>;
          return (
            <li key={o.id} className="card ui">
              <h3>
                {fmtDate(o.createdAt)} · {formatPrice(o.totalCents, o.currency)} · {o.status.toLowerCase().replace("_", " ")}
              </h3>
              <p className="small">
                {o.items.map((i) => `${i.quantity}× ${i.variant.product.name} ${i.variant.size}`).join(", ")}
              </p>
              <p className="small">
                {o.shippingName}, {[a.line1, a.line2, a.postal_code, a.city, a.country].filter(Boolean).join(", ")}
              </p>
              {o.codes.length ? <p className="small">Codes packed: {o.codes.map((c) => formatCode(c.code)).join(", ")}</p> : null}
              <form action={update} className="actions">
                <input type="hidden" name="id" value={o.id} />
                <div>
                  <label htmlFor={`s-${o.id}`}>Status</label>
                  <select id={`s-${o.id}`} name="status" defaultValue={o.status}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`t-${o.id}`}>Tracking number</label>
                  <input id={`t-${o.id}`} name="tracking" type="text" defaultValue={o.trackingNumber ?? ""} />
                </div>
                <div>
                  <label htmlFor={`c-${o.id}`}>Patch code (optional)</label>
                  <input id={`c-${o.id}`} name="code" type="text" className="code-input" />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button type="submit" className="secondary">
                    Save
                  </button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
