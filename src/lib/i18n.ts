import { cookies, headers } from "next/headers";
import en from "../../messages/en.json";

// O-3: English first; de, es, pt follow. Add a messages/<locale>.json and list it here.
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
type Messages = typeof en;

const catalogs: Record<Locale, Messages> = { en };

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get("locale")?.value;
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) return fromCookie as Locale;
  const accept = (await headers()).get("accept-language") ?? "";
  const match = LOCALES.find((l) => accept.toLowerCase().startsWith(l));
  return match ?? "en";
}

/** t("site", "nav.docs") -> string. Falls back to English, then to the key. */
export async function getT<N extends keyof Messages>(namespace: N) {
  const locale = await getLocale();
  const ns = catalogs[locale][namespace] as Record<string, string>;
  const fallback = catalogs.en[namespace] as Record<string, string>;
  return (key: string) => ns[key] ?? fallback[key] ?? key;
}
