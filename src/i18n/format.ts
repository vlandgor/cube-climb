// Pure message formatting: no DOM, so tests can use it directly.
import type { en } from "./locales/en";

/** A plural message: one string per CLDR plural category the language uses. */
export type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Message = string | Plural;
export type Key = keyof typeof en;
/** A full translation: every key, strings where English has strings, plurals where it has plurals. */
export type Messages = { [K in Key]: (typeof en)[K] extends string ? string : Plural };
export type Params = Record<string, string | number>;

const rulesCache: Record<string, Intl.PluralRules> = {};
function rules(locale: string) {
  return rulesCache[locale] || (rulesCache[locale] = new Intl.PluralRules(locale));
}

/** Pick the plural form for n (if needed) and fill {placeholders}. */
export function format(locale: string, msg: Message, params?: Params): string {
  let s: string;
  if (typeof msg === "string") s = msg;
  else {
    const n = Number(params && params.n);
    s = msg[rules(locale).select(n)] ?? msg.other;
  }
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
