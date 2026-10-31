import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import YAML from "yaml";
import { z } from "zod";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const OUTLINE = path.join(ROOT, "docs", "source", "game-outline.md");

// ---------- Schemas (§7) ----------

export const FORMS = ["exercise", "challenge", "quest", "world-quest", "threshold-quest", "side-quest"] as const;
export type Form = (typeof FORMS)[number];

export const FORM_LABELS: Record<Form, string> = {
  exercise: "Exercise",
  challenge: "Challenge",
  quest: "Quest",
  "world-quest": "World Quest",
  "threshold-quest": "Threshold Quest",
  "side-quest": "Side Quest",
};

/** Form rules from the outline, shown on the docs page and used as validation hints. */
export const FORM_RULES: Record<Form, string> = {
  exercise: "5 to 30 minutes, repeatable, no completion state.",
  challenge: "One task, 1 to 7 days, one topic, clear completion condition.",
  quest: "2 to 6 weeks, several stages, ends with a written log reflection.",
  "world-quest": "Played with other players; the result changes the shared outer world. Each level has at least one.",
  "threshold-quest": "The last quest of each level.",
  "side-quest": "Optional, with a catalyst; counts toward a topic, never required for a transition.",
};

const TopicSchema = z.object({ id: z.string(), title: z.string(), description: z.string() });

export const LevelSchema = z.object({
  number: z.number().int().min(0).max(8),
  slug: z.string(),
  name: z.string(),
  chakra: z.string().nullable(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  centralTheme: z.string().nullable(),
  topics: z.array(TopicSchema),
  status: z.enum(["published", "in-preparation"]),
});
export type Level = z.infer<typeof LevelSchema> & { dir: string };
export type Topic = z.infer<typeof TopicSchema>;

export const ItemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  level: z.number().int().min(0).max(8),
  topics: z.array(z.string()).min(1),
  form: z.enum(FORMS),
  duration: z.string(),
  stages: z.array(z.string()).optional(),
  completeWhen: z.string().optional(),
  pairVariant: z.string().optional(),
  circleVariant: z.string().optional(),
  kind: z.literal("core"),
  sensitive: z.boolean().default(false),
  thresholdLetter: z.boolean().default(false),
});
export type Item = z.infer<typeof ItemSchema> & { body: string; ref: string; levelSlug: string };

const PageSchema = z.object({
  title: z.string(),
  order: z.number().optional(),
  question: z.enum(["why", "how", "what"]).optional(),
  fromOutline: z.array(z.string()).optional(),
  showFormRules: z.boolean().optional(),
  showSpiral: z.boolean().optional(),
  supportNotice: z.boolean().optional(),
  audio: z.string().nullable().optional(),
  video: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
});
export type Page = z.infer<typeof PageSchema> & { slug: string; html: string };

// ---------- Loaders ----------

let levelCache: Level[] | null = null;
let itemCache: Item[] | null = null;
const cacheOn = process.env.NODE_ENV === "production";

export function getLevels(): Level[] {
  if (cacheOn && levelCache) return levelCache;
  const dir = path.join(CONTENT, "levels");
  const levels = readdirSync(dir)
    .filter((d) => existsSync(path.join(dir, d, "level.yml")))
    .map((d) => ({ ...LevelSchema.parse(YAML.parse(readFileSync(path.join(dir, d, "level.yml"), "utf8"))), dir: d }))
    .sort((a, b) => a.number - b.number);
  levelCache = levels;
  return levels;
}

export function getLevel(number: number): Level | undefined {
  return getLevels().find((l) => l.number === number);
}

export function getLevelBySlug(slug: string): Level | undefined {
  return getLevels().find((l) => l.slug === slug);
}

export function getItems(): Item[] {
  if (cacheOn && itemCache) return itemCache;
  const out: Item[] = [];
  for (const level of getLevels()) {
    const dir = path.join(CONTENT, "levels", level.dir, "items");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
      const { data, content } = matter(readFileSync(path.join(dir, f), "utf8"));
      const parsed = ItemSchema.parse(data);
      out.push({ ...parsed, body: content.trim(), ref: `core:${level.slug}/${parsed.slug}`, levelSlug: level.slug });
    }
  }
  itemCache = out;
  return out;
}

export function getItemsForLevel(number: number): Item[] {
  const order: Form[] = ["exercise", "challenge", "quest", "side-quest", "world-quest", "threshold-quest"];
  return getItems()
    .filter((i) => i.level === number)
    .sort((a, b) => order.indexOf(a.form) - order.indexOf(b.form) || a.title.localeCompare(b.title));
}

export function getItemByRef(ref: string): Item | undefined {
  return getItems().find((i) => i.ref === ref);
}

export function thresholdItem(level: number): Item | undefined {
  return getItems().find((i) => i.level === level && i.form === "threshold-quest");
}

// ---------- Outline sections ----------

function stripMd(s: string) {
  return s.replace(/[*_]/g, "").trim();
}

/** Returns the markdown of a heading's section, including its subsections. */
export function outlineSection(title: string): string | null {
  const lines = readFileSync(OUTLINE, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{1,6} /.test(l) && stripMd(l.replace(/^#+ /, "")) === title);
  if (start < 0) return null;
  const depth = lines[start].match(/^#+/)![0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= depth) {
      end = i;
      break;
    }
  }
  const heading = `## ${stripMd(lines[start].replace(/^#+ /, ""))}`;
  // Re-base subsection headings under the section heading.
  const body = lines
    .slice(start + 1, end)
    .filter((l) => !l.startsWith("<!--"))
    .map((l) => {
      const m = l.match(/^(#+) (.*)$/);
      return m ? `${"#".repeat(Math.min(6, 2 + m[1].length - depth))} ${stripMd(m[2])}` : l;
    });
  return [heading, ...body].join("\n").trim();
}

export function renderMarkdown(md: string): string {
  // Content comes from this repository only (trusted); never pass user input here.
  return marked.parse(md, { async: false }) as string;
}

function loadPages(sub: string): Page[] {
  const dir = path.join(CONTENT, sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const { data, content } = matter(readFileSync(path.join(dir, f), "utf8"));
      const meta = PageSchema.parse(data);
      const parts = (meta.fromOutline ?? []).map((t, i) => {
        const s = outlineSection(t);
        if (!s) throw new Error(`${sub}/${f}: outline section "${t}" not found`);
        // The page renders its title as <h1>; drop a first section heading that only repeats it.
        return i === 0 && t.toLowerCase() === meta.title.toLowerCase() ? s.replace(/^## .*\n?/, "") : s;
      });
      if (content.trim()) parts.push(content.trim());
      return { ...meta, slug: f.replace(/\.mdx?$/, ""), html: renderMarkdown(parts.join("\n\n")) };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export const getDocs = () => loadPages("docs");
export const getTutorial = () => loadPages("tutorial");
export const getLegal = () => loadPages("legal");

export function getCrisisLines(): {
  emergency: { label: string; number: string };
  lines: { country: string; name: string; number: string }[];
} {
  return YAML.parse(readFileSync(path.join(CONTENT, "support", "crisis-lines.yml"), "utf8"));
}

// ---------- Validation hints (build time) ----------

export function contentHints(): string[] {
  const hints: string[] = [];
  for (const level of getLevels()) {
    const items = getItemsForLevel(level.number);
    const topicIds = new Set(level.topics.map((t) => t.id));
    for (const it of items) {
      for (const t of it.topics) if (!topicIds.has(t)) throw new Error(`${it.ref}: unknown topic "${t}"`);
      if (it.form === "challenge" && it.topics.length > 1)
        hints.push(`${it.ref}: a challenge usually belongs to one topic (${FORM_RULES.challenge})`);
      if ((it.form === "challenge" || it.form.endsWith("quest")) && !it.completeWhen && it.form !== "quest")
        hints.push(`${it.ref}: no completion condition`);
      if (it.form === "exercise" && it.completeWhen) hints.push(`${it.ref}: exercises have no completion state`);
    }
    if (level.status === "published" && level.number > 0) {
      if (!items.some((i) => i.form === "world-quest")) hints.push(`${level.slug}: no World Quest`);
      if (!items.some((i) => i.form === "threshold-quest")) hints.push(`${level.slug}: no Threshold Quest`);
    }
  }
  return hints;
}
