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
  const container = db
    .prepare("SELECT * FROM v_containers WHERE id = ?")
    .get(req.params.id);
  if (!container) {
    return res.status(404).json({ error: "Container not found" });
  }
  if (!container.bean_id) {
    return res.json({ empty: true, container_name: container.name });
  }
  const bean = db
    .prepare("SELECT * FROM v_beans WHERE id = ?")
    .get(container.bean_id);
  res.json({ empty: false, container_name: container.name, bean });
});

module.exports = router;
