import { db } from "./db";

/** Admin-adjustable values. Defaults come from the outline's "guiding values" and §12. */
export const SETTING_DEFAULTS = {
  // §5.6: community quest becomes eligible for review after N completions from different circles.
  reviewThreshold: 10,
  // §5.6: soft limit on new public quests per player per 30 days.
  publicQuestsPerMonth: 1,
  // O-1: false = topic coverage is information only (default); true = hard lock.
  transitionTopicLock: false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends boolean ? boolean : number;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.setting.findUnique({ where: { key } });
  return (row ? row.value : SETTING_DEFAULTS[key]) as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function allSettings() {
  const out: Record<string, number | boolean> = {};
  for (const k of Object.keys(SETTING_DEFAULTS) as SettingKey[]) out[k] = await getSetting(k);
  return out as { [K in SettingKey]: SettingValue<K> };
}
