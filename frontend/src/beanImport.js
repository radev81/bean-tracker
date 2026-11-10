// src/beanImport.js
// ─────────────────────────────────────────────────────────────────────────────
// "Import bean details" — checks a JSON bean (made by the bean-import Claude
// skill from a shop's product page) before the new-bean form uses it.
//
// The JSON has the same shape as the body of POST /api/beans (see
// backend/src/routes/beans.js and beanToPayload in beanUtils.js), minus the
// things you choose in the form yourself (container).
//
//   parseBeanImport(text) → { ok: true,  bean, ignored }   – safe to use
//                         → { ok: false, errors: [...] }   – show the errors
//
// Nothing is saved here: the form is filled and you review it first.
// ─────────────────────────────────────────────────────────────────────────────

// Text fields of a bean: string or null
const TEXT_FIELDS = [
  "name",
  "shop_name",
  "country",
  "url",
  "region",
  "altitude",
  "variety",
  "farm_producer",
  "processing",
  "notes",
];

// Fields of the POST body that an import doesn't set — they're chosen in the
// form. Accepted (so a full API body also works) but not used.
const IGNORED_FIELDS = ["container_id", "skipDuplicateCheck", "replaceContainer"];

const KNOWN_FIELDS = [...TEXT_FIELDS, "sca_score", "flavour_tags", "recipes", ...IGNORED_FIELDS];

const RECIPE_NUMBERS = ["dose_in_g", "yield_out_g", "time_seconds", "temp_celsius"];
const RECIPE_TEXT = ["ratio", "notes"];
const RECIPE_FIELDS = ["shot_type", ...RECIPE_NUMBERS, ...RECIPE_TEXT];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const typeName = (v) => (v === null ? "null" : Array.isArray(v) ? "a list" : typeof v);

/**
 * Pull the JSON object out of pasted text. When copying from a chat on a
 * phone you often get the ```json fences or a sentence around it too, so we
 * take everything from the first "{" to the last "}".
 */
export function extractJsonText(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export function parseBeanImport(text) {
  if (!text || !text.trim()) {
    return { ok: false, errors: ["Paste the bean JSON or choose a .json file first."] };
  }

  const jsonText = extractJsonText(text);
  if (!jsonText) {
    return { ok: false, errors: ["No JSON object found — it should start with { and end with }."] };
  }

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    // Phones sometimes turn "quotes" into “curly quotes” — try once more
    // with straight quotes before giving up
    try {
      data = JSON.parse(jsonText.replace(/[\u201C\u201D]/g, '"'));
    } catch {
      return { ok: false, errors: [`This isn't valid JSON: ${err.message}`] };
    }
  }

  if (!isPlainObject(data)) {
    return { ok: false, errors: ["The JSON must be one bean object { … }, not a list or a value."] };
  }

  const errors = [];

  // ── Unknown fields ────────────────────────────────────────────────────────
  Object.keys(data)
    .filter((k) => !KNOWN_FIELDS.includes(k))
    .forEach((k) => errors.push(`Unknown field "${k}".`));

  // ── Text fields ───────────────────────────────────────────────────────────
  TEXT_FIELDS.forEach((k) => {
    if (k in data && data[k] !== null && typeof data[k] !== "string") {
      errors.push(`"${k}" must be text, not ${typeName(data[k])}.`);
    }
  });

  // ── SCA score ─────────────────────────────────────────────────────────────
  if ("sca_score" in data && data.sca_score !== null) {
    if (!isNumber(data.sca_score)) {
      errors.push(`"sca_score" must be a number (e.g. 87.5), not ${typeName(data.sca_score)}.`);
    } else if (data.sca_score < 0 || data.sca_score > 100) {
      errors.push(`"sca_score" must be between 0 and 100 (got ${data.sca_score}).`);
    }
  }

  // ── Flavour tags ──────────────────────────────────────────────────────────
  if ("flavour_tags" in data) {
    if (!Array.isArray(data.flavour_tags)) {
      errors.push(`"flavour_tags" must be a list of text, e.g. ["Peach", "Jasmine"].`);
    } else if (data.flavour_tags.some((t) => typeof t !== "string")) {
      errors.push(`Every flavour tag must be text.`);
    }
  }

  // ── Recipes (only the double shot is used by the form) ────────────────────
  let doubleRecipe = null;
  if ("recipes" in data) {
    if (!Array.isArray(data.recipes)) {
      errors.push(`"recipes" must be a list, e.g. [{ "shot_type": "double", … }].`);
    } else {
      data.recipes.forEach((r, i) => {
        const at = `recipes[${i}]`;
        if (!isPlainObject(r)) {
          errors.push(`${at} must be an object.`);
          return;
        }
        Object.keys(r)
          .filter((k) => !RECIPE_FIELDS.includes(k))
          .forEach((k) => errors.push(`Unknown field "${k}" in ${at}.`));
        if (r.shot_type !== "double") {
          errors.push(`${at}: "shot_type" must be "double" (only the double shot can be imported).`);
        }
        RECIPE_NUMBERS.forEach((k) => {
          if (k in r && r[k] !== null && !(isNumber(r[k]) && r[k] >= 0)) {
            errors.push(`${at}: "${k}" must be a positive number, not ${typeName(r[k])}.`);
          }
        });
        RECIPE_TEXT.forEach((k) => {
          if (k in r && r[k] !== null && typeof r[k] !== "string") {
            errors.push(`${at}: "${k}" must be text, not ${typeName(r[k])}.`);
          }
        });
      });
      if (data.recipes.length > 1) {
        errors.push(`Only one recipe (the double shot) can be imported.`);
      }
      doubleRecipe = data.recipes.find((r) => isPlainObject(r) && r.shot_type === "double") ?? null;
    }
  }

  if (errors.length) return { ok: false, errors };

  // ── Clean result: only fields that have a value ───────────────────────────
  const bean = {};
  TEXT_FIELDS.forEach((k) => {
    if (typeof data[k] === "string" && data[k].trim()) bean[k] = data[k].trim();
  });
  if (isNumber(data.sca_score)) bean.sca_score = data.sca_score;

  if (Array.isArray(data.flavour_tags)) {
    const tags = [];
    data.flavour_tags.forEach((t) => {
      const tag = t.trim();
      if (tag && !tags.some((x) => x.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    });
    if (tags.length) bean.flavour_tags = tags;
  }

  if (doubleRecipe) {
    const recipe = {};
    RECIPE_NUMBERS.forEach((k) => {
      if (isNumber(doubleRecipe[k])) recipe[k] = doubleRecipe[k];
    });
    if (typeof doubleRecipe.notes === "string" && doubleRecipe.notes.trim()) {
      recipe.notes = doubleRecipe.notes.trim();
    }
    if (Object.keys(recipe).length) bean.recipe = recipe;
  }

  const ignored = IGNORED_FIELDS.filter((k) => k in data);
  const filled = Object.keys(bean).length;

  if (filled === 0) {
    return { ok: false, errors: ["The JSON has no bean details to fill in."] };
  }

  return { ok: true, bean, ignored };
}
