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
