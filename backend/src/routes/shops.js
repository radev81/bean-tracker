const express = require("express");
const router = express.Router();
const db = require("../db/database");

// ── GET /api/shops ────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const shops = db.prepare("SELECT * FROM v_shops ORDER BY name ASC").all();
  res.json(shops);
});

// ── GET /api/shops/:id ────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const shop = db
    .prepare("SELECT * FROM v_shops WHERE id = ?")
    .get(req.params.id);
  if (!shop) return res.status(404).json({ error: "Shop not found" });
  res.json(shop);
});

// ── POST /api/shops ───────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { name, url } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const existing = db
    .prepare("SELECT id FROM shops WHERE name = ? COLLATE NOCASE")
    .get(name.trim());
  if (existing) {
    return res
      .status(409)
      .json({ error: "A shop with that name already exists" });
  }

  const result = db
    .prepare("INSERT INTO shops (name, url) VALUES (?, ?)")
    .run(name.trim(), url?.trim() || null);

  const created = db
    .prepare("SELECT * FROM v_shops WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(created);
});

// ── PUT /api/shops/:id ────────────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  const { name, url } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const shop = db
    .prepare("SELECT id FROM shops WHERE id = ?")
    .get(req.params.id);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  // Duplicate check — exclude self so saving unchanged name doesn't error
  const duplicate = db
    .prepare("SELECT id FROM shops WHERE name = ? COLLATE NOCASE AND id != ?")
    .get(name.trim(), req.params.id);
  if (duplicate) {
    return res
      .status(409)
      .json({ error: "A shop with that name already exists" });
  }

  db.prepare("UPDATE shops SET name = ?, url = ? WHERE id = ?").run(
    name.trim(),
    url?.trim() || null,
    req.params.id,
  );

  const updated = db
    .prepare("SELECT * FROM v_shops WHERE id = ?")
    .get(req.params.id);

  res.json(updated);
});

// ── DELETE /api/shops/:id ─────────────────────────────────────────────────────
// Blocked if any beans still reference this shop (ON DELETE RESTRICT in schema).
// We check first and return 409 with a clear message rather than letting
// SQLite throw a generic FK error.
router.delete("/:id", (req, res) => {
  const shop = db
    .prepare("SELECT * FROM v_shops WHERE id = ?")
    .get(req.params.id);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  if (shop.bean_count > 0) {
    return res.status(409).json({
      error: `Cannot delete — ${shop.bean_count} ${shop.bean_count === 1 ? "bean references" : "beans reference"} this shop.`,
      bean_count: shop.bean_count,
    });
  }

  db.prepare("DELETE FROM shops WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
