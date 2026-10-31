import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/shop";
import { ProductArt, SHOP_EXPLAINER } from "@/components/shop";

export const metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await db.product.findMany({
    where: { listed: true },
    include: { variants: { where: { active: true } } },
    orderBy: [{ series: "asc" }, { type: "asc" }],
  });
  return (
    <div className="wide">
      <h1>Symbols of recognition</h1>
      <div className="wrap" style={{ marginLeft: 0, padding: 0 }}>
        {SHOP_EXPLAINER}
      </div>
      <ul className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))" }}>
        {products.map((p) => {
          const from = Math.min(...p.variants.map((v) => v.priceCents));
          return (
            <li key={p.id} className="card">
              <ProductArt product={p} />
              <Link className="stretch" href={`/shop/${p.slug}`}>
                <h3 style={{ marginTop: "0.75rem" }}>{p.name}</h3>
              </Link>
              <div className="meta">
                {p.comingSoon ? <span>Coming</span> : p.variants.length ? <span>{formatPrice(from, p.variants[0].currency)}</span> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
