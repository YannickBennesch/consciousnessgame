import type { CSSProperties } from "react";
import type { Level } from "@/lib/content";
import { FORM_LABELS, type Form } from "@/lib/content";

export function accentStyle(level?: Pick<Level, "colour" | "number">): CSSProperties | undefined {
  if (!level || level.number === 0 || level.number === 8) return undefined;
  return { ["--accent" as string]: level.colour, ["--accent-fg" as string]: "#ffffff" };
}

export function Swatch({ level }: { level: Pick<Level, "colour" | "number"> }) {
  return (
    <span
      aria-hidden="true"
      className={`level-swatch${level.number === 8 ? " infinity" : ""}`}
      style={{ ["--swatch" as string]: level.number === 0 ? "linear-gradient(90deg,#111 50%,#fff 50%)" : level.colour }}
    />
  );
}

export function levelLabel(level: Pick<Level, "number" | "name">) {
  return level.number === 0 ? "Tutorial" : `Level ${level.number}: ${level.name.replace(/^The /, "")}`;
}

export function FormTag({ form }: { form: string }) {
  return <span className="tag">{FORM_LABELS[form as Form] ?? form}</span>;
}

export function Html({ html, className = "prose" }: { html: string; className?: string }) {
  // Only used for repository content rendered by lib/content (trusted).
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Notice({ children, role }: { children: React.ReactNode; role?: "status" | "alert" }) {
  return (
    <div className="notice" role={role}>
      {children}
    </div>
  );
}

export function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
