import Link from "next/link";
import { getLevels } from "@/lib/content";
import { levelLabel, Swatch } from "@/components/ui";

export default function Home() {
  return (
    <div className="wrap">
      <h1>The Consciousness Development Game</h1>
      <p className="lede">
        “We are developing a real-world game that leads to the expansion of our consciousness by integrating what has not
        been integrated yet.”
      </p>
      <p className="muted small ui">Described by Yannick Bennesch and Diana Luz Ruffin Escribano.</p>

      <div className="actions">
        <Link className="btn" href="/play">
          I have a player code
        </Link>
        <Link className="btn secondary" href="/docs">
          Read about the game
        </Link>
      </div>

      <h2>How to enter</h2>
      <p>
        Entry to the game costs one thing: a first symbol of recognition from the black and white series, as a T-shirt or a
        sweatshirt. Each piece carries a patch with a QR code and a player code. Everything after that is free.
      </p>
      <p>
        <Link href="/shop">See the symbols of recognition</Link>
      </p>

      <h2>The spiral</h2>
      <ul className="spiral">
        {getLevels().map((l) => (
          <li key={l.number}>
            <Swatch level={l} />
            {levelLabel(l)}
            {l.chakra ? <span className="muted"> · {l.chakra.toLowerCase()}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
