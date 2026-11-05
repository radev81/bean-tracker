// src/beanUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Small helpers shared by several screens (bean list, bean detail, dial-in,
// containers, QR page).
// ─────────────────────────────────────────────────────────────────────────────

/** Round to at most 1 decimal and drop trailing zeros: 9.0 → 9, 9.50 → 9.5 */
export function fmt(val) {
  if (val == null || val === "") return null;
  return parseFloat(Number(val).toFixed(1));
}

/** Yield ÷ dose as a number (2.0), or null when either is missing. */
export function ratioNumber(inG, outG) {
  if (!inG || !outG || inG <= 0) return null;
  return outG / inG;
}

/** Ratio text "1:2" / "1:2.2", or null. Same format as stored in the DB. */
export function computeRatio(inG, outG) {
  const r = ratioNumber(inG, outG);
  return r == null ? null : `1:${parseFloat(r.toFixed(1))}`;
}

/** The double-shot recipe row of a full bean (from GET /api/beans/:id). */
export function getDoubleRecipe(bean) {
  return bean?.recipes?.find((r) => r.shot_type === "double") ?? null;
}

/** Make sure a link opens even if it was saved without "https://". */
export function externalUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** "https://www.nomadcoffee.es/products/x" → "nomadcoffee.es" */
export function hostname(url) {
  if (!url) return "";
  try {
    return new URL(externalUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "Ineffable · Ethiopia · Natural" — skips empty parts. */
export function metaLine(...parts) {
  return parts.filter(Boolean).join(" · ");
}

/**
 * Build the body for PUT /api/beans/:id from a FULL bean
 * (the result of api.getBeanById, which includes tags and recipes).
 *
 * The PUT endpoint replaces every field, the flavour tags and the double
 * recipe — so a "small" change (assign a container, tweak the recipe) must
 * still send everything else unchanged. Pass the changes in `overrides`.
 */
export function beanToPayload(bean, overrides = {}) {
  return {
    name: bean.name,
    shop_name: bean.shop_name,
    country: bean.country,
    url: bean.url ?? null,
    region: bean.region ?? null,
    altitude: bean.altitude ?? null,
    variety: bean.variety ?? null,
    farm_producer: bean.farm_producer ?? null,
    processing: bean.processing ?? null,
    sca_score: bean.sca_score ?? null,
    notes: bean.notes ?? null,
    container_id: bean.container_id ?? null,
    flavour_tags: bean.tags ?? [],
    recipes: (bean.recipes ?? []).map((r) => ({
      shot_type: r.shot_type,
      dose_in_g: r.dose_in_g,
      yield_out_g: r.yield_out_g,
      time_seconds: r.time_seconds,
      temp_celsius: r.temp_celsius,
      ratio: r.ratio,
      notes: r.notes,
    })),
    ...overrides,
  };
}
