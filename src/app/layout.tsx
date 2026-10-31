import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "The Consciousness Development Game", template: "%s · The Consciousness Development Game" },
  description: "A real-world game that leads to the expansion of our consciousness by integrating what has not been integrated yet.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [t, user, locale] = [await getT("site"), await currentUser(), await getLocale()];
  return (
    <html lang={locale}>
      <body>
        <a className="skip" href="#main">
          {t("skip")}
        </a>
        <header className="site-header">
          <div className="wide">
            <Link href="/" className="brand">
              {t("title")}
            </Link>
            <nav aria-label="Main">
              <Link href="/docs">{t("nav.docs")}</Link>
              <Link href="/shop">{t("nav.shop")}</Link>
              <Link href="/support">{t("nav.support")}</Link>
              {user ? <Link href="/profile">{t("nav.profile")}</Link> : <Link href="/signin">{t("nav.signin")}</Link>}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="wide">
            <nav aria-label="Legal">
              <Link href="/legal/imprint">{t("footer.imprint")}</Link>
              <Link href="/legal/privacy">{t("footer.privacy")}</Link>
              <Link href="/legal/shop-terms">{t("footer.terms")}</Link>
            </nav>
            <p>{t("footer.disclaimer")}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
