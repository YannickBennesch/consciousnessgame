// Build-time content validation (§7): schemas are enforced, form rules are reported as hints.
import { contentHints, getDocs, getItems, getLegal, getLevels, getTutorial } from "../src/lib/content";

try {
  const levels = getLevels();
  const items = getItems();
  getDocs();
  getTutorial();
  getLegal();
  if (levels.length !== 9) throw new Error(`expected 9 levels, found ${levels.length}`);
  for (const h of contentHints()) console.warn(`hint: ${h}`);
  console.log(`content ok: ${levels.length} levels, ${items.length} items`);
} catch (e) {
  console.error(`content error: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
