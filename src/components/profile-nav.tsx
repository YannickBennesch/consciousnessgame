"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="profile-nav" aria-label="Profile">
      <ul>
        {links.map((l) => {
          const current = l.href === "/profile" ? path === l.href : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={current ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
