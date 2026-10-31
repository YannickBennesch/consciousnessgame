import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const r = user.roles;
  if (!r.some((x) => x !== "PLAYER")) redirect("/profile");
  return (
    <div className="wide">
      <nav aria-label="Admin" className="ui actions" style={{ marginTop: 0 }}>
        <Link href="/profile">← My profile</Link>
        {r.includes("ADMIN") ? (
          <>
            <Link href="/admin/codes">Code batches</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/admin/roles">Roles</Link>
          </>
        ) : null}
        {r.includes("SUPPORT") ? <Link href="/admin/support">Support requests</Link> : null}
        {r.includes("REVIEWER") ? <Link href="/admin/review">Review</Link> : null}
      </nav>
      {children}
    </div>
  );
}
