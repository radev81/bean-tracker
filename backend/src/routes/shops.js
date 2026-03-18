const express = require("express");
const router = express.Router();
const db = require("../db/database");

// GET /api/shops — all shops with bean count
router.get("/", (req, res) => {
  const shops = db.prepare("SELECT * FROM v_shops ORDER BY name ASC").all();
  res.json(shops);
});

module.exports = router;
