import fs from "node:fs";

const src = fs.readFileSync(
  "E:/code/zqw/wheat-esp-tools/src/locales/i18n.ts",
  "utf8"
);

function extractPetObject(fromIndex) {
  const petKey = src.indexOf("pet: {", fromIndex);
  if (petKey < 0) throw new Error(`pet block not found from ${fromIndex}`);
  let depth = 0;
  let start = -1;
  for (let j = petKey; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") {
      if (depth === 0) start = j;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  throw new Error("unclosed pet block");
}

// First pet: { after zh menu is the zh pet messages (line ~66)
const zhPet = extractPetObject(src.indexOf('pet: "芯宠"'));
const enPet = extractPetObject(src.indexOf('pet: "Chip Pet"'));

const out = `import { createI18n } from "vue-i18n";

const messages = {
  zh: {
    pet: ${zhPet},
  },
  en: {
    pet: ${enPet},
  },
};

const i18n = createI18n({
  legacy: false,
  locale: "zh",
  fallbackLocale: "en",
  messages,
});

export default i18n;
`;

fs.writeFileSync("E:/code/zqw/desktop-pet/src/locales/i18n.ts", out);
console.log("ok", out.length);
