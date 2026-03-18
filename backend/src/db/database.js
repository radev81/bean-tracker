const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../../data/bean.db");

// Create the data folder if it doesn't exist yet
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Apply the schema (IF NOT EXISTS means this is safe to run every startup)
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

console.log("Database ready at", DB_PATH);

module.exports = db;
