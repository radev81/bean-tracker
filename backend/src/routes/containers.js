import express from "express";
import db from "../db/database.js";

const router = express.Router();

// ── GET /api/containers ───────────────────────────────────────────────────────
// Returns all containers with occupancy info (uses v_containers view).
// CON-01, CON-02
router.get("/", (req, res) => {
  const containers = db
    .prepare("SELECT * FROM v_containers ORDER BY name ASC")
    .all();
  res.json(containers);
});

// ── GET /api/containers/:id ───────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const container = db
    .prepare("SELECT * FROM v_containers WHERE id = ?")
    .get(req.params.id);
  if (!container) return res.status(404).json({ error: "Container not found" });
  res.json(container);
});

// ── POST /api/containers ──────────────────────────────────────────────────────
// Create a new container.
// CON-08: save succeeds when name is unique.
// CON-06: caller should check for duplicate first — but we also guard here.
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  // Duplicate check (CON-06)
  const existing = db
    .prepare("SELECT id FROM containers WHERE name = ? COLLATE NOCASE")
    .get(name.trim());
  if (existing) {
    return res
      .status(409)
      .json({ error: "A container with that name already exists" });
  }

  const result = db
    .prepare("INSERT INTO containers (name) VALUES (?)")
    .run(name.trim());

  const created = db
    .prepare("SELECT * FROM v_containers WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(created);
});

// ── PUT /api/containers/:id ───────────────────────────────────────────────────
// Rename a container.
// CON-14, CON-16
router.put("/:id", (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const container = db
    .prepare("SELECT id FROM containers WHERE id = ?")
    .get(req.params.id);
  if (!container) return res.status(404).json({ error: "Container not found" });

  // Duplicate check — exclude self so saving unchanged name doesn't error
  const duplicate = db
    .prepare(
      "SELECT id FROM containers WHERE name = ? COLLATE NOCASE AND id != ?",
    )
    .get(name.trim(), req.params.id);
  if (duplicate) {
    return res
      .status(409)
      .json({ error: "A container with that name already exists" });
  }

  db.prepare("UPDATE containers SET name = ? WHERE id = ?").run(
    name.trim(),
    req.params.id,
  );

  const updated = db
    .prepare("SELECT * FROM v_containers WHERE id = ?")
    .get(req.params.id);

  res.json(updated);
});

// ── DELETE /api/containers/:id ────────────────────────────────────────────────
// Remove a container. The ON DELETE SET NULL FK means any assigned bean
// is automatically unassigned in SQLite. CON-20, CON-21
router.delete("/:id", (req, res) => {
  const container = db
    .prepare("SELECT id FROM containers WHERE id = ?")
    .get(req.params.id);
  if (!container) return res.status(404).json({ error: "Container not found" });

  db.prepare("DELETE FROM containers WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ── GET /api/containers/:id/current-bean ─────────────────────────────────────
// Used by the QR scan page. CB-72, CB-73
router.get("/:id/current-bean", (req, res) => {
  const container = db
    .prepare("SELECT id, name FROM containers WHERE id = ?")
    .get(req.params.id);
  if (!container) {
    return res.status(404).json({ error: "Container not found" });
  }

  const bean = db
    .prepare(
      `
    SELECT b.*, s.name AS shop_name
    FROM   beans b
    JOIN   shops s ON s.id = b.shop_id
    WHERE  b.container_id = ?
  `,
    )
    .get(req.params.id);

  if (!bean) return res.json({ container, bean: null });

  const tags = db
    .prepare(
      "SELECT tag FROM bean_flavour_tags WHERE bean_id = ? ORDER BY sort_order",
    )
    .all(bean.id)
    .map((r) => r.tag);

  const recipes = db
    .prepare("SELECT * FROM bean_recipes WHERE bean_id = ?")
    .all(bean.id);

  res.json({ container, bean: { ...bean, tags, recipes } });
});

export default router;
