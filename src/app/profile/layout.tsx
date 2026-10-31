import { requireUser, signOut } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { ProfileNav } from "@/components/profile-nav";

export const metadata = { title: "My profile", robots: { index: false } };

async function doSignOut() {
  "use server";
  await signOut();
  redirect("/");
}

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getT("profile");
  const links = [
    { href: "/profile", label: t("nav.home") },
    { href: "/profile/tutorial", label: t("nav.tutorial") },
    { href: "/profile/levels", label: t("nav.levels") },
    { href: "/profile/log", label: t("nav.log") },
    { href: "/profile/topics", label: t("nav.topics") },
    { href: "/profile/quests", label: t("nav.quests") },
    { href: "/profile/community", label: t("nav.community") },
    { href: "/profile/gratitude", label: t("nav.gratitude") },
    { href: "/profile/settings", label: t("nav.settings") },
    { href: "/support", label: t("nav.support") },
  ];
  if (user.roles.some((r) => r !== "PLAYER")) links.push({ href: "/admin", label: t("nav.admin") });
  return (
    <div className="wide profile">
      <div>
        <ProfileNav links={links} />
        <form action={doSignOut}>
          <button type="submit" className="link">
            {t("signout")}
          </button>
        </form>
      </div>
      <div>{children}</div>
    </div>
  );
}
