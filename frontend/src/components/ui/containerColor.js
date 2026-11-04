// components/ui/containerColor.js
// ─────────────────────────────────────────────────────────────────────────────
// Containers only have a name in the database (e.g. "Grey", "Green").
// To give each one a coloured ring without changing the backend, we look for
// a colour word in the name — in English, Spanish or Dutch.
// No colour word found → a neutral ring.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  { color: "#9A968E", words: ["grey", "gray", "gris", "grijs", "silver", "plata", "zilver"] },
  { color: "#6E9A62", words: ["green", "verde", "groen"] },
  { color: "#6F9CC8", words: ["blue", "azul", "blauw"] },
  { color: "#C8695A", words: ["red", "rojo", "roja", "rood"] },
  { color: "#E0904A", words: ["orange", "naranja", "oranje"] },
  { color: "#D8B45A", words: ["yellow", "amarillo", "geel", "gold", "oro", "goud"] },
  { color: "#9A84C0", words: ["purple", "violet", "morado", "lila", "paars"] },
  { color: "#D08AA0", words: ["pink", "rosa", "roze"] },
  { color: "#8A6A50", words: ["brown", "marrón", "marron", "bruin", "copper", "cobre", "koper"] },
  { color: "#E8E3D6", words: ["white", "blanco", "blanca", "wit", "cream", "crema"] },
  { color: "#5E5B55", words: ["black", "negro", "negra", "zwart"] },
];

const NEUTRAL = "var(--line-hi)";

/** Ring colour for a container name, e.g. containerColor("Grey") → "#9A968E". */
export function containerColor(name = "") {
  const words = name.toLowerCase().split(/[^a-záéíóúñ]+/i);
  const hit = PALETTE.find((p) => p.words.some((w) => words.includes(w)));
  return hit ? hit.color : NEUTRAL;
}
