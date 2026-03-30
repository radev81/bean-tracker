// backend/src/routes/beans.js

import express from "express";
import db from "../db/database.js";

const router = express.Router();

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
//  Creates a new bean. Required fields: name, shop_name, country.
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
// PUT /api/beans/:id  (CB-53 to CB-66)
// Updates an existing bean. All fields are optional except name, shop_name and country.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  const beanId = parseInt(req.params.id);

  // Check the bean exists
  const existing = db.prepare("SELECT * FROM beans WHERE id = ?").get(beanId);
  if (!existing) {
    return res.status(404).json({ error: "Bean not found" });
  }

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
    flavour_tags = [],
    replaceContainer = false,
  } = req.body;

  // ── Validate required fields ───────────────────────────────────────
  if (!name?.trim() || !shop_name?.trim() || !country?.trim()) {
    return res
      .status(400)
      .json({ error: "name, shop_name and country are required" });
  }

  // ── Find or create shop ────────────────────────────────────────────
  let shop = db
    .prepare("SELECT id FROM shops WHERE name = ? COLLATE NOCASE")
    .get(shop_name.trim());

  if (!shop) {
    const r = db
      .prepare("INSERT INTO shops (name) VALUES (?)")
      .run(shop_name.trim());
    shop = { id: r.lastInsertRowid };
  }

  // ── Container occupied check (CB-64) ──────────────────────────────
  // Only check if a container is selected, it differs from the current
  // assignment, and the user hasn't already confirmed replacement
  const containerChanged =
    (container_id || null) !== (existing.container_id || null);

  if (container_id && containerChanged && !replaceContainer) {
    const occupant = db
      .prepare("SELECT id, name FROM beans WHERE container_id = ? AND id != ?")
      .get(container_id, beanId);

    if (occupant) {
      return res.status(409).json({
        conflict: "container_occupied",
        occupant: { id: occupant.id, name: occupant.name },
      });
    }
  }

  // ── Replace container occupant if requested (CB-65) ───────────────
  if (container_id && containerChanged && replaceContainer) {
    db.prepare(
      "UPDATE beans SET container_id = NULL WHERE container_id = ? AND id != ?",
    ).run(container_id, beanId);
  }

  // ── Unassign from old container if container was removed (CB-62) ──
  // This is handled implicitly by setting container_id = NULL below

  // ── Update the bean ───────────────────────────────────────────────
  db.prepare(
    `
    UPDATE beans SET
      name          = ?,
      shop_id       = ?,
      country       = ?,
      url           = ?,
      region        = ?,
      altitude      = ?,
      variety       = ?,
      farm_producer = ?,
      processing    = ?,
      sca_score     = ?,
      notes         = ?,
      container_id  = ?
    WHERE id = ?
  `,
  ).run(
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
    beanId,
  );

  // ── Replace flavour tags ───────────────────────────────────────────
  // Delete all existing tags for this bean and re-insert from scratch.
  // Simpler than diffing and avoids orphaned tags.
  db.prepare("DELETE FROM bean_flavour_tags WHERE bean_id = ?").run(beanId);

  const insertTag = db.prepare(
    "INSERT INTO bean_flavour_tags (bean_id, tag, sort_order) VALUES (?, ?, ?)",
  );
  flavour_tags.forEach((tag, i) => insertTag.run(beanId, tag.trim(), i));

  // ── Return the updated card ────────────────────────────────────────
  const updated = db.prepare("SELECT * FROM v_beans WHERE id = ?").get(beanId);
  return res.json(updated);
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/beans/:id  (CB-67 to CB-71)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const beanId = parseInt(req.params.id);

  const bean = db.prepare("SELECT * FROM beans WHERE id = ?").get(beanId);
  if (!bean) {
    return res.status(404).json({ error: "Bean not found" });
  }

  // Deleting the bean is enough — the FK on bean_flavour_tags and
  // bean_recipes is ON DELETE CASCADE so child rows are removed
  // automatically. container_id on the bean row simply disappears
  // with the row (CB-70). The shop is NOT deleted (CB-71).
  db.prepare("DELETE FROM beans WHERE id = ?").run(beanId);

  res.json({ deleted: true, id: beanId });
});

export default router;
