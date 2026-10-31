// Development seed: shop products and one test code batch.
// Game content (levels, items, docs) lives in content/ and needs no seeding.
import { PrismaClient } from "@prisma/client";
import { createBatch, formatCode, codeUrl } from "../src/lib/codes";

const db = new PrismaClient();
const SIZES = ["S", "M", "L", "XL"];

async function product(data: {
  slug: string;
  name: string;
  type: "TSHIRT" | "SWEATSHIRT" | "PATCH";
  series: string;
  description: string;
  listed?: boolean;
  comingSoon?: boolean;
  priceCents: number;
}) {
  const { priceCents, ...p } = data;
  const existing = await db.product.findUnique({ where: { slug: p.slug } });
  if (existing) return existing;
  // PLACEHOLDER prices: the admins set real prices in /admin/products.
  return db.product.create({
    data: { ...p, variants: { create: (p.type === "PATCH" ? ["one size"] : SIZES).map((size) => ({ size, priceCents })) } },
  });
}

async function main() {
  await product({
    slug: "tutorial-tshirt",
    name: "Tutorial T-shirt (black and white)",
    type: "TSHIRT",
    series: "tutorial-bw",
    description: "From Diana Luz’s first series. The symbol of the tutorial, and the lower-cost entry to the game.",
    priceCents: 3500,
  });
  await product({
    slug: "tutorial-sweatshirt",
    name: "Tutorial sweatshirt (black and white)",
    type: "SWEATSHIRT",
    series: "tutorial-bw",
    description: "From Diana Luz’s first series. The symbol of the tutorial.",
    priceCents: 6500,
  });
  await product({
    slug: "red-tshirt",
    name: "Red series T-shirt",
    type: "TSHIRT",
    series: "red",
    description: "The symbol of Level 1, the root. Optional: it records a transition, it does not cause one.",
    comingSoon: true,
    priceCents: 3500,
  });
  // O-2: low-cost entry option modelled but not listed.
  await product({
    slug: "tutorial-patch",
    name: "Tutorial patch",
    type: "PATCH",
    series: "tutorial-bw",
    description: "A patch with QR code and player code, without a garment.",
    listed: false,
    priceCents: 500,
  });

  if ((await db.codeBatch.count()) === 0) {
    const batch = await createBatch("tutorial-bw", 5, "development test codes");
    const codes = await db.playerCode.findMany({ where: { batchId: batch.id } });
    console.log("Test player codes:");
    for (const c of codes) console.log(`  ${formatCode(c.code)}  ${codeUrl(c.code)}`);
  }
}

main().finally(() => db.$disconnect());
