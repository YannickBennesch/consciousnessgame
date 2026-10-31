import type { LogEntry } from "@prisma/client";
import { fmtDate } from "./ui";

/** The log entry fields from §5.4. */
export function EntryFields({ entry, visibleAllowed }: { entry?: Partial<LogEntry>; visibleAllowed: boolean }) {
  return (
    <>
      <label htmlFor="date">Date</label>
      <input id="date" name="date" type="date" defaultValue={fmtDate(entry?.date ?? new Date())} />
      <label htmlFor="did">What I did</label>
      <textarea id="did" name="did" defaultValue={entry?.did} />
      <label htmlFor="changed">What changed</label>
      <textarea id="changed" name="changed" defaultValue={entry?.changed} />
      <label htmlFor="refereeSaid">What the inner referee said</label>
      <textarea id="refereeSaid" name="refereeSaid" defaultValue={entry?.refereeSaid} />
      <VisibilityField value={entry?.visibility} visibleAllowed={visibleAllowed} />
    </>
  );
}

export function VisibilityField({ value, visibleAllowed }: { value?: string; visibleAllowed: boolean }) {
  return (
    <fieldset>
      <legend>Who can see this entry</legend>
      <label className="choice">
        <input type="radio" name="visibility" value="PRIVATE" defaultChecked={value !== "VISIBLE"} />
        <span>Only me</span>
      </label>
      <label className="choice">
        <input type="radio" name="visibility" value="VISIBLE" defaultChecked={value === "VISIBLE"} />
        <span>
          Players who have made themselves visible
          {!visibleAllowed ? (
            <span className="hint">You are private at the moment, so nobody else sees it until you change that in Settings.</span>
          ) : null}
        </span>
      </label>
    </fieldset>
  );
}
