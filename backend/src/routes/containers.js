const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /api/containers — all containers with occupancy info
router.get("/", (req, res) => {
  const containers = db
    .prepare("SELECT * FROM v_containers ORDER BY name ASC")
    .all();
  res.json(containers);
});

// GET /api/containers/:id/current-bean — used by QR code page
router.get("/:id/current-bean", (req, res) => {
  // 1. Check the container exists
  const container = db
    .prepare("SELECT id, name FROM containers WHERE id = ?")
    .get(req.params.id);

  if (!container) {
    return res.status(404).json({ error: "Container not found" });
  }

  // 2. Find the bean assigned to this container
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

  if (!bean) {
    return res.json({ container, bean: null });
  }

  // 3. Attach tags and recipes
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

module.exports = router;
