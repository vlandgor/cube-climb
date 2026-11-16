// LOCALIZATION — the current language, t() for code, and data-i18n for the page markup.
// English is bundled; every other language is its own small chunk, loaded on demand.
import { en } from "./locales/en";
import { format, type Key, type Messages, type Params } from "./format";

export interface Locale { code: string; name: string; rtl?: boolean; }

/** Shipped languages, named in their own language (that is how the picker shows them). */
export const LOCALES: Locale[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "pl", name: "Polski" },
  { code: "tr", name: "Türkçe" },
  { code: "uk", name: "Українська" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "hi", name: "हिन्दी" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-Hans", name: "简体中文" },
];

const loaders = import.meta.glob<{ default: Messages }>(["./locales/*.ts", "!./locales/en.ts"]);

let code = "en";
let dict: Messages = en;

export function locale() { return code; }

/** Translate a key. Plural messages pick their form from params.n. */
export function t(key: Key, params?: Params): string {
  return format(code, dict[key] ?? en[key], params);
}

/** The best shipped match for the device's language list; English if none. */
export function detect(prefs: readonly string[] = navigator.languages || [navigator.language]): string {
  const codes = LOCALES.map(l => l.code);
  for (const p of prefs) {
    if (!p) continue;
    const exact = codes.find(c => c.toLowerCase() === p.toLowerCase());
    if (exact) return exact;
    const base = p.split("-")[0].toLowerCase();
    const same = codes.find(c => c.split("-")[0].toLowerCase() === base);   // pt-PT → pt-BR, zh-TW → zh-Hans
    if (same) return same;
  }
  return "en";
}

/** Switch language: load it if needed, then retranslate the page. */
export async function setLocale(next: string) {
  if (!LOCALES.some(l => l.code === next)) next = "en";
  let d: Messages = en;
  if (next !== "en") {
    try { d = (await loaders[`./locales/${next}.ts`]()).default; }
    catch { next = "en"; }                      // a chunk failed to load: stay playable in English
  }
  code = next; dict = d;
  const root = document.documentElement;
  root.lang = next;
  root.dir = LOCALES.find(l => l.code === next)?.rtl ? "rtl" : "ltr";
  applyStatic();
}

/** Fill every element marked data-i18n="key" in the page. */
export function applyStatic(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach(el => {
    el.innerHTML = t(el.dataset.i18n as Key);
  });
}
