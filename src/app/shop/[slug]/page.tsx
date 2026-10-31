import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createCheckout, formatPrice } from "@/lib/shop";
import { str } from "@/lib/request";
import { ProductArt, SHOP_EXPLAINER } from "@/components/shop";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

async function buy(form: FormData) {
  "use server";
  const slug = str(form, "slug");
  let url: string;
  try {
    ({ url } = await createCheckout([{ variantId: str(form, "variant"), quantity: Math.max(1, Number(str(form, "quantity")) || 1) }]));
  } catch (e) {
    console.error("[checkout]", e);
    redirect(`/shop/${slug}?error=1`);
  }
  redirect(url);
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const product = await db.product.findUnique({
    where: { slug: (await params).slug },
    include: { variants: { where: { active: true }, orderBy: { priceCents: "asc" } } },
  });
  if (!product || !product.listed) notFound();
  const configured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="wrap">
      <p className="ui small">
        <Link href="/shop">Shop</Link>
      </p>
      <h1>{product.name}</h1>
      <div style={{ maxWidth: "24rem" }}>
        <ProductArt product={product} />
      </div>
      <p>{product.description}</p>
      {SHOP_EXPLAINER}
      {(await searchParams).error ? (
        <Notice role="alert">
          <p>The checkout could not be opened. Please try again in a moment.</p>
        </Notice>
      ) : null}
      {product.comingSoon ? (
        <p className="ui">
          <strong>Coming.</strong> This series is not available yet.
        </p>
      ) : !configured ? (
        <Notice>
          <p>The shop is not open yet.</p>
        </Notice>
      ) : (
        <form action={buy}>
          <input type="hidden" name="slug" value={product.slug} />
          <fieldset>
            <legend>Size{product.variants.some((v) => v.cut) ? " and cut" : ""}</legend>
            {product.variants.map((v, i) => (
              <label key={v.id} className="choice">
                <input type="radio" name="variant" value={v.id} required defaultChecked={i === 0} />
                <span>
                  {v.size}
                  {v.cut ? `, ${v.cut}` : ""} · {formatPrice(v.priceCents, v.currency)}
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min={1} max={10} defaultValue={1} style={{ maxWidth: "6rem" }} />
          <div className="actions">
            <button type="submit">Continue to payment</button>
          </div>
          <p className="hint">Payment is handled by Stripe. Shipping within the EU.</p>
        </form>
      )}
    </div>
  );
}
