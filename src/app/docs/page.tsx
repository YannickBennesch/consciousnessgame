import Link from "next/link";
import { getDocs } from "@/lib/content";

export const metadata = { title: "About the game" };

export default function DocsIndex() {
  return (
    <div className="wrap">
      <h1>About the game</h1>
      <ul className="cards">
        {getDocs().map((d) => (
          <li key={d.slug} className="card">
            <Link className="stretch" href={`/docs/${d.slug}`}>
              <h3>{d.title}</h3>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
