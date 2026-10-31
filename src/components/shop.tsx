import type { Product } from "@prisma/client";

export const SHOP_EXPLAINER = (
  <>
    <p>
      The drawings by Diana Luz are printed on T-shirts and sweatshirts. Each piece carries a patch with a QR code and a player
      code.
    </p>
    <p>
      <strong>The first black-and-white piece is the entry to the game.</strong> Everything after that, the tutorial, all
      levels, all exercises, challenges and quests, is free. Later pieces are optional and do not move anyone forward in the
      game.
    </p>
    <p className="muted small ui">
      Buying a piece does not create a player account. To play, enter the code on the patch when your piece arrives.
    </p>
  </>
);

/** Artwork is supplied by the authors in public/art/. Until then, a neutral placeholder. */
export function ProductArt({ product }: { product: Pick<Product, "imagePath" | "imageAlt" | "name"> }) {
  if (product.imagePath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imagePath} alt={product.imageAlt ?? product.name} style={{ width: "100%", borderRadius: 6 }} />;
  }
  return (
    <div className="art-placeholder" role="img" aria-label={`${product.name}: artwork to follow`}>
      Artwork to follow
    </div>
  );
}
