import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "../../data/bean.db");

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Migrations — add columns that don't exist yet in live databases.
// PRAGMA table_info works on all SQLite versions.
const recipeColumns = db.prepare("PRAGMA table_info(bean_recipes)").all();
if (!recipeColumns.find((c) => c.name === "notes")) {
  db.exec("ALTER TABLE bean_recipes ADD COLUMN notes TEXT");
}

console.log("Database ready at", DB_PATH);

export default db;
