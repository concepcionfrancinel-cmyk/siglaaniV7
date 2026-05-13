export const BADGE_MAP = {
  ripe:     { cls:"badge-ripe",     label:"Hinog ✓",        dot:"#5cb83a" },
  overripe: { cls:"badge-overripe", label:"Sobrang Hinog",  dot:"#f9a825" },
  unripe:   { cls:"badge-unripe",   label:"Hindi Pa Hinog", dot:"#3d9bd4" },
  rotten:   { cls:"badge-rotten",   label:"Bulok ✗",        dot:"#ef5350" },
};

export function badge(cond) { return BADGE_MAP[cond] ?? BADGE_MAP.ripe; }

// ── COCO-SSD labels we accept for bounding box drawing ──────────────────────
export const COCO_FRUIT_LABELS = [
  "apple", "banana", "orange",
];

// ── MobileNet ImageNet → Filipino fruit name ──────────────────────────────────
// MobileNet returns strings like "banana", "Granny Smith", "lemon" etc.
// We map any prediction that CONTAINS these substrings (case-insensitive).
// Replace the old array with this
export const MOBILENET_FRUIT_MAP = [
  { keys: ["banana"],                     fruit: "Saging",    scientific: "Musa acuminata",  hsvKey: "banana" },
  { keys: ["granny smith", "apple"],      fruit: "Apple",     scientific: "Malus domestica", hsvKey: "apple"  },
  { keys: ["orange"],                     fruit: "Orange",  scientific: "Citrus sinensis", hsvKey: "orange" }
];

// Resolve a MobileNet prediction string to our fruit entry
export function resolveMobileNet(predLabel) {
  const lower = predLabel.toLowerCase();
  return MOBILENET_FRUIT_MAP.find(entry =>
    entry.keys.some(k => lower.includes(k))
  ) ?? null;
}

// ── COCO label → our fruit entry ─────────────────────────────────────────────
// Replace the old object with this
export const COCO_NAME_MAP = {
  apple:  { fruit:"Apple",    scientific:"Malus domestica", hsvKey:"apple"  },
  banana: { fruit:"Saging",   scientific:"Musa acuminata",  hsvKey:"banana" },
  orange: { fruit:"Orange", scientific:"Citrus sinensis", hsvKey:"orange" }
};

export const RECOMMENDATIONS = {
  ripe:     "Ang prutas ay nasa tamang kondisyon para sa pagkain. Maaari na itong kainin ngayon o ilagay sa ref sa loob ng 5–7 araw.",
  overripe: "Ang prutas ay medyo sobrang hinog na. Angkop pa rin para sa pagluluto o smoothie. Gamitin kaagad sa loob ng 1–2 araw.",
  unripe:   "Ang prutas ay hindi pa ganap na hinog. Ilagay sa maaliwalas na lugar. Magiging handa ito sa loob ng 2–4 araw.",
  rotten:   "Ang prutas ay hindi na ligtas kainin. Itapon na ito agad para maiwasan ang kontaminasyon sa ibang pagkain.",
};

export const MOCK = [
  { fruit:"Apple",   scientific:"Malus domestica",     condition:"ripe",     conditionLabel:"Hinog (Ripe)",   confidence:82, rating:4, recommendation:"Ang prutas ay nasa tamang kondisyon para sa pagkain. Maaari na itong kainin ngayon o ilagay sa ref sa loob ng 5–7 araw." },
  { fruit:"Saging",  scientific:"Musa acuminata",       condition:"overripe", conditionLabel:"Sobrang Hinog",  confidence:79, rating:2, recommendation:"Ang prutas ay medyo sobrang hinog na. Angkop pa rin para sa pagluluto o smoothie. Gamitin kaagad sa loob ng 1–2 araw." },
  { fruit:"Mangga",  scientific:"Mangifera indica",     condition:"ripe",     conditionLabel:"Hinog (Ripe)",   confidence:88, rating:5, recommendation:"Ang prutas ay nasa tamang kondisyon para sa pagkain. Maaari na itong kainin ngayon o ilagay sa ref sa loob ng 5–7 araw." },
  { fruit:"Kamatis", scientific:"Solanum lycopersicum", condition:"unripe",   conditionLabel:"Hindi Pa Hinog", confidence:74, rating:3, recommendation:"Ang prutas ay hindi pa ganap na hinog. Ilagay sa maaliwalas na lugar. Magiging handa ito sa loob ng 2–4 araw." },
];
