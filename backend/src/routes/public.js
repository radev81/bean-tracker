// backend/src/routes/public.js
// ─────────────────────────────────────────────────────────────────────────────
// Public, READ-ONLY routes — no login needed.
// Mounted at /api/public in index.js, BEFORE the protected routes.
//
// GET /api/public/containers/:id
//   What the QR code page shows to someone without an account (CB-105):
//   the container's number and name, and the bean inside it with its origin,
//   flavour tags, tasting notes and espresso recipe.
//
// Deliberately NOT included: database ids of beans/shops, product links,
// favourites, timestamps — and nothing can be changed through this router.
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import db from "../db/database.js";

const router = express.Router();

router.get("/containers/:id", (req, res) => {
  // Container numbers are whole numbers; reject anything else early
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Container not found" });
  }

  // Always fresh: the bean in a container changes
  res.set("Cache-Control", "no-store");

  try {
    const container = db
      .prepare("SELECT id, name FROM containers WHERE id = ?")
      .get(id);
    if (!container) {
      return res.status(404).json({ error: "Container not found" });
    }

    const bean = db
      .prepare(
        `
      SELECT b.id, b.name, s.name AS shop_name, b.country, b.region,
             b.altitude, b.variety, b.processing, b.farm_producer,
             b.sca_score, b.notes
      FROM   beans b
      JOIN   shops s ON s.id = b.shop_id
      WHERE  b.container_id = ?
    `,
      )
      .get(id);

    if (!bean) return res.json({ container, bean: null });

    const tags = db
      .prepare(
        "SELECT tag FROM bean_flavour_tags WHERE bean_id = ? ORDER BY sort_order, id",
      )
      .all(bean.id)
      .map((r) => r.tag);

    const recipes = db
      .prepare(
        `SELECT shot_type, dose_in_g, yield_out_g, ratio, time_seconds,
                temp_celsius, notes
         FROM   bean_recipes WHERE bean_id = ? ORDER BY shot_type`,
      )
      .all(bean.id);

    // Leave the internal bean id out of the public reply
    const { id: _beanId, ...publicBean } = bean;
    res.json({ container, bean: { ...publicBean, tags, recipes } });
  } catch (err) {
    console.error(`GET /api/public/containers/${id}:`, err.message);
    res.status(500).json({ error: "Failed to load container" });
  }
});

export default router;
