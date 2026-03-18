const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /api/beans — all beans, favourites first
router.get("/", (req, res) => {
  const beans = db
    .prepare(
      `SELECT * FROM v_beans
       ORDER BY is_favourite DESC, favourite_order ASC, name ASC`,
    )
    .all();
  res.json(beans);
});

// GET /api/beans/:id — single bean
router.get("/:id", (req, res) => {
  const bean = db
    .prepare("SELECT * FROM v_beans WHERE id = ?")
    .get(req.params.id);
  if (!bean) return res.status(404).json({ error: "Bean not found" });
  res.json(bean);
});

module.exports = router;
