import { getCrisisLines } from "@/lib/content";
import { SUPPORT_NOTICE } from "@/lib/support";

export function SupportNotice() {
  const { emergency, lines } = getCrisisLines();
  return (
    <div className="notice" role="note">
      <p>{SUPPORT_NOTICE}</p>
      <details>
        <summary>Crisis lines</summary>
        <ul>
          <li>
            {emergency.label}: <strong>{emergency.number}</strong>
          </li>
          {lines.map((l) => (
            <li key={l.country}>
              {l.country}, {l.name}: <strong>{l.number}</strong>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function SensitiveNotice() {
  return (
    <div className="notice" role="note">
      <p>You may postpone this for as long as you need. There is no penalty and no reminder.</p>
      <p>
        If it touches something you cannot carry alone, you can reach a support contact. <a href="#support">Ask for support</a>
      </p>
    </div>
  );
}
