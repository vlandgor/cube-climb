// Checks every translation against English: same keys, same {placeholders}, same <b> tags,
// and a form for every plural category the language actually uses (per CLDR via Intl).
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { en } from "../src/i18n/locales/en";
import { format, type Message, type Messages } from "../src/i18n/format";

const dir = new URL("../src/i18n/locales/", import.meta.url);
const codes = readdirSync(dir).map(f => f.replace(/\.ts$/, "")).filter(c => c !== "en");

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const tags = (s: string) => (s.match(/<\/?b>/g) || []).join("");
const forms = (m: Message) => (typeof m === "string" ? [m] : Object.values(m));

describe.each(codes)("%s", code => {
  let msgs: Messages;
  it("loads", async () => {
    msgs = (await import(`../src/i18n/locales/${code}.ts`)).default;
    expect(Object.keys(msgs).sort()).toEqual(Object.keys(en).sort());
  });

  it("keeps placeholders and tags", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const ref = forms(en[key])[forms(en[key]).length - 1];   // English "other"
      for (const s of forms(msgs[key])) {
        expect(placeholders(s), `${code} ${key}`).toEqual(placeholders(ref));
        expect(tags(s), `${code} ${key}`).toBe(tags(ref));
        expect(s.trim().length, `${code} ${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it("has every plural form the language needs", () => {
    const need = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const m = msgs[key];
      if (typeof en[key] === "string") { expect(typeof m, `${code} ${key}`).toBe("string"); continue; }
      expect(typeof m, `${code} ${key}`).toBe("object");
      for (const cat of need) expect((m as Record<string, string>)[cat], `${code} ${key} needs "${cat}"`).toBeTruthy();
    }
  });
});

describe("format", () => {
  it("picks Slavic plural forms", async () => {
    const uk: Messages = (await import("../src/i18n/locales/uk")).default;
    const f = (n: number) => format("uk", uk["over.unit"], { n });
    expect([f(1), f(3), f(5), f(21), f(11)]).toEqual(["сходинка", "сходинки", "сходинок", "сходинка", "сходинок"]);
  });
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(format("en", en["pause.info"], { h: 3, b: 9 })).toBe("Height <b>3</b> · best <b>9</b>");
    expect(format("en", "keep {x}", { n: 1 })).toBe("keep {x}");
  });
});
