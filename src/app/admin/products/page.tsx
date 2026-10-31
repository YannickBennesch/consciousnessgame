import { revalidatePath } from "next/cache";
import type { ProductType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatPrice } from "@/lib/shop";
import { str } from "@/lib/request";

async function addProduct(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  await db.product.create({
    data: {
      slug: str(form, "slug").trim(),
      name: str(form, "name").trim(),
      type: str(form, "type") as ProductType,
      series: str(form, "series").trim(),
      description: str(form, "description"),
      listed: str(form, "listed") === "on",
      comingSoon: str(form, "comingSoon") === "on",
      imagePath: str(form, "imagePath").trim() || null,
      imageAlt: str(form, "imageAlt").trim() || null,
    },
  });
  revalidatePath("/admin/products");
}

async function toggle(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const field = str(form, "field");
  if (field !== "listed" && field !== "comingSoon") return;
  const p = await db.product.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.product.update({ where: { id: p.id }, data: { [field]: !p[field] } });
  revalidatePath("/admin/products");
}

async function addVariant(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const euros = Number(str(form, "price").replace(",", "."));
  if (!Number.isFinite(euros) || euros <= 0) return;
  await db.variant.create({
    data: {
      productId: str(form, "productId"),
      size: str(form, "size").trim(),
      cut: str(form, "cut").trim() || null,
      priceCents: Math.round(euros * 100),
    },
  });
  revalidatePath("/admin/products");
}

async function toggleVariant(form: FormData) {
  "use server";
  await requireRole("ADMIN");
  const v = await db.variant.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.variant.update({ where: { id: v.id }, data: { active: !v.active } });
  revalidatePath("/admin/products");
}

export default async function ProductsPage() {
  await requireRole("ADMIN");
  const products = await db.product.findMany({ include: { variants: true }, orderBy: { series: "asc" } });
  return (
    <>
      <h1>Products</h1>
      <p className="ui small muted">Prices, sizes and print method are set by the admins. Patches (O-2) can exist without being listed.</p>
      {products.map((p) => (
        <section key={p.id} className="card ui" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{p.name}</h2>
          <p className="meta">
            <span>{p.type.toLowerCase()}</span>
            <span>{p.series}</span>
            <span>{p.listed ? "listed" : "not listed"}</span>
            {p.comingSoon ? <span>shown as “coming”</span> : null}
          </p>
          <div className="actions">
            {(["listed", "comingSoon"] as const).map((f) => (
              <form key={f} action={toggle}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="field" value={f} />
                <button type="submit" className="secondary">
                  {f === "listed" ? (p.listed ? "Unlist" : "List") : p.comingSoon ? "Open for sale" : "Mark as coming"}
                </button>
              </form>
            ))}
          </div>
          <ul>
            {p.variants.map((v) => (
              <li key={v.id}>
                <form action={toggleVariant} className="choice" style={{ alignItems: "center" }}>
                  <input type="hidden" name="id" value={v.id} />
                  <span>
                    {v.size}
                    {v.cut ? `, ${v.cut}` : ""} · {formatPrice(v.priceCents, v.currency)} {v.active ? "" : "(inactive)"}
                  </span>
                  <button type="submit" className="link">
                    {v.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addVariant} className="actions">
            <input type="hidden" name="productId" value={p.id} />
            <div>
              <label htmlFor={`size-${p.id}`}>Size</label>
              <input id={`size-${p.id}`} name="size" type="text" required />
            </div>
            <div>
              <label htmlFor={`cut-${p.id}`}>Cut (optional)</label>
              <input id={`cut-${p.id}`} name="cut" type="text" />
            </div>
            <div>
              <label htmlFor={`price-${p.id}`}>Price (EUR)</label>
              <input id={`price-${p.id}`} name="price" type="text" inputMode="decimal" required />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button type="submit" className="secondary">
                Add variant
              </button>
            </div>
          </form>
        </section>
      ))}

      <h2>New product</h2>
      <form action={addProduct}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required />
        <label htmlFor="slug">URL slug</label>
        <input id="slug" name="slug" type="text" required pattern="[a-z0-9-]+" />
        <label htmlFor="type">Type</label>
        <select id="type" name="type">
          <option value="TSHIRT">T-shirt</option>
          <option value="SWEATSHIRT">Sweatshirt</option>
          <option value="PATCH">Patch</option>
        </select>
        <label htmlFor="series">Series</label>
        <input id="series" name="series" type="text" defaultValue="tutorial-bw" required />
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" />
        <label htmlFor="imagePath">
          Image path <span className="hint">A file in public/art/, e.g. /art/tutorial-tee.jpg</span>
        </label>
        <input id="imagePath" name="imagePath" type="text" />
        <label htmlFor="imageAlt">Image description (alt text)</label>
        <input id="imageAlt" name="imageAlt" type="text" />
        <label className="choice">
          <input type="checkbox" name="listed" defaultChecked />
          <span>Listed in the shop</span>
        </label>
        <label className="choice">
          <input type="checkbox" name="comingSoon" />
          <span>Show as “coming”</span>
        </label>
        <div className="actions">
          <button type="submit">Create product</button>
        </div>
      </form>
    </>
  );
}
