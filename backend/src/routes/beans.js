// backend/src/routes/beans.js

const express = require("express");
const router = express.Router();
const db = require("../db/database");

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/beans
//  Returns all beans from the v_beans view, favourites first then A–Z.
//  This is the list endpoint — tags and recipes are NOT included here
//  (they're fetched on-demand when a card is expanded).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const beans = db
      .prepare(
        `
      SELECT *
      FROM   v_beans
      ORDER  BY is_favourite DESC,
                favourite_order ASC,
                name            COLLATE NOCASE ASC
    `,
      )
      .all();
    res.json(beans);
  } catch (err) {
    console.error("GET /api/beans:", err.message);
    res.status(500).json({ error: "Failed to fetch beans" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/beans/:id
//  Returns a single bean (from v_beans) PLUS its flavour tags and recipes.
//  Called the first time a card is expanded so we lazy-load the extra data.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const { id } = req.params;
  try {
    const bean = db.prepare("SELECT * FROM v_beans WHERE id = ?").get(id);
    if (!bean) {
      return res.status(404).json({ error: "Bean not found" });
    }

    // Flavour tags — ordered by sort_order (the order the user added them)
    const tagRows = db
      .prepare(
        "SELECT tag FROM bean_flavour_tags WHERE bean_id = ? ORDER BY sort_order ASC, id ASC",
      )
      .all(id);

    // Espresso recipes — up to two rows: 'single' and/or 'double'
    const recipes = db
      .prepare(
        "SELECT * FROM bean_recipes WHERE bean_id = ? ORDER BY shot_type ASC",
      )
      .all(id);

    res.json({
      ...bean,
      tags: tagRows.map((r) => r.tag),
      recipes,
    });
  } catch (err) {
    console.error(`GET /api/beans/${id}:`, err.message);
    res.status(500).json({ error: "Failed to fetch bean" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/beans (CB-25, CB-32, CB-35–CB-41)
//  ...
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const {
    name,
    shop_name,
    country,
    url = null,
    region = null,
    altitude = null,
    variety = null,
    farm_producer = null,
    processing = null,
    sca_score = null,
    notes = null,
    container_id = null,
    flavour_tags = [], // array of strings
    skipDuplicateCheck = false, // CB-33: user acknowledged duplicate
    replaceContainer = false, // CB-40: user chose to replace occupant
  } = req.body;

  // ── Validate required fields (CB-27) ──────────────────────────────────
  if (!name?.trim() || !shop_name?.trim() || !country?.trim()) {
    return res
      .status(400)
      .json({ error: "name, shop_name and country are required" });
  }

  // ── Duplicate bean name check (CB-32) ─────────────────────────────────
  if (!skipDuplicateCheck) {
    const existing = db
      .prepare("SELECT id, name FROM beans WHERE name = ? COLLATE NOCASE")
      .get(name.trim());

    if (existing) {
      return res.status(409).json({
        conflict: "duplicate_name",
        existingBean: { id: existing.id, name: existing.name },
      });
    }
  }

  // ── Find or create shop (CB-36, CB-37) ────────────────────────────────
  let shop = db
    .prepare("SELECT id FROM shops WHERE name = ? COLLATE NOCASE")
    .get(shop_name.trim());

  if (!shop) {
    const r = db
      .prepare("INSERT INTO shops (name) VALUES (?)")
      .run(shop_name.trim());
    shop = { id: r.lastInsertRowid };
  }

  // ── Container occupied check (CB-39) ──────────────────────────────────
  if (container_id && !replaceContainer) {
    const occupant = db
      .prepare("SELECT id, name FROM beans WHERE container_id = ?")
      .get(container_id);

    if (occupant) {
      return res.status(409).json({
        conflict: "container_occupied",
        occupant: { id: occupant.id, name: occupant.name },
      });
    }
  }

  // ── Replace container occupant if requested (CB-40) ───────────────────
  if (container_id && replaceContainer) {
    db.prepare(
      "UPDATE beans SET container_id = NULL WHERE container_id = ?",
    ).run(container_id);
  }

  // ── Insert the new bean ───────────────────────────────────────────────
  const insertBean = db.prepare(`
    INSERT INTO beans
      (name, shop_id, country, url, region, altitude, variety,
       farm_producer, processing, sca_score, notes, container_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const { lastInsertRowid: beanId } = insertBean.run(
    name.trim(),
    shop.id,
    country.trim(),
    url || null,
    region || null,
    altitude || null,
    variety || null,
    farm_producer || null,
    processing || null,
    sca_score ? parseFloat(sca_score) : null,
    notes || null,
    container_id ? parseInt(container_id) : null,
  );

  // ── Insert flavour tags ───────────────────────────────────────────────
  const insertTag = db.prepare(
    "INSERT INTO bean_flavour_tags (bean_id, tag, sort_order) VALUES (?, ?, ?)",
  );
  flavour_tags.forEach((tag, i) => insertTag.run(beanId, tag.trim(), i));

  // ── Return the full saved card (using the view) ───────────────────────
  const bean = db.prepare("SELECT * FROM v_beans WHERE id = ?").get(beanId);
  return res.status(201).json(bean);
});

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/beans/:id/favourite
//  Flips is_favourite between 0 and 1.
//  Returns { id, is_favourite } with the NEW value so the client knows
//  the current state without a second request.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/favourite", (req, res) => {
  const { id } = req.params;
  try {
    const bean = db
      .prepare("SELECT id, is_favourite FROM beans WHERE id = ?")
      .get(id);

    if (!bean) {
      return res.status(404).json({ error: "Bean not found" });
    }

    const newValue = bean.is_favourite === 1 ? 0 : 1;
    db.prepare("UPDATE beans SET is_favourite = ? WHERE id = ?").run(
      newValue,
      id,
    );

    res.json({ id: parseInt(id, 10), is_favourite: newValue });
  } catch (err) {
    console.error(`PUT /api/beans/${id}/favourite:`, err.message);
    res.status(500).json({ error: "Failed to toggle favourite" });
  }
});

module.exports = router;
