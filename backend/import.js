/**
 * import.js — one-time Supabase → SQLite migration
 * ──────────────────────────────────────────────────
 * Usage (run from the backend/ folder):
 *   node import.js
 *
 * Expects these CSV files in backend/data/import/:
 *   shops_rows.csv
 *   containers_rows.csv
 *   coffee_beans_rows.csv
 *   coffee_container_assignments_rows.csv
 *   user_coffee_favorites_rows.csv
 *
 * Safe to re-run: wraps everything in a transaction that rolls
 * back completely if anything goes wrong.
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// ── Paths ────────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "data", "bean.db");
const IMPORT_DIR = path.join(__dirname, "data", "import");

// ── Simple CSV parser (handles quoted fields with commas inside) ──────────────
function parseCSV(filename) {
  const filePath = path.join(IMPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠  File not found, skipping: ${filename}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8").replace(/\r/g, "");
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]);

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        const v = values[i];
        // Treat empty strings as null
        obj[h] = v === "" || v === undefined ? null : v;
      });
      return obj;
    });
}

function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle doubled quotes ("") inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Parse a time value that might be a range like "29-30" → take the lower bound
function parseTime(val) {
  if (!val) return null;
  const n = parseFloat(String(val).split("-")[0]);
  return isNaN(n) ? null : Math.round(n);
}

// Parse a float, return null if not a valid number
function parseFloat2(val) {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n☕  Beans Tracker — Supabase → SQLite import\n");

const db = new Database(DB_PATH);

// Enable WAL and foreign keys (same as schema)
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Read all CSV files up front
const rawShops = parseCSV("shops_rows.csv");
const rawContainers = parseCSV("containers_rows.csv");
const rawBeans = parseCSV("coffee_beans_rows.csv");
const rawAssignments = parseCSV("coffee_container_assignments_rows.csv");
const rawFavorites = parseCSV("user_coffee_favorites_rows.csv");

console.log(`  Shops read:        ${rawShops.length}`);
console.log(`  Containers read:   ${rawContainers.length}`);
console.log(`  Beans read:        ${rawBeans.length}`);
console.log(`  Assignments read:  ${rawAssignments.length}`);
console.log(`  Favorites read:    ${rawFavorites.length}`);
console.log("");

// UUID → SQLite integer ID maps (built as we insert)
const shopUuidToId = {}; // Supabase shop id (integer stored as string) → SQLite id
const containerUuidToId = {}; // Supabase container UUID → SQLite id
const beanUuidToId = {}; // Supabase bean UUID → SQLite id

// ── Run everything in a single transaction ────────────────────────────────────
const run = db.transaction(() => {
  // ── 1. SHOPS ──────────────────────────────────────────────────────────────
  console.log("1/5  Importing shops…");

  const insertShop = db.prepare(`
    INSERT INTO shops (name, url, created_at, updated_at)
    VALUES (@name, @url, @created_at, @updated_at)
  `);

  for (const s of rawShops) {
    const info = insertShop.run({
      name: s.name,
      url: s.url ?? null,
      created_at: s.created_at ?? new Date().toISOString(),
      updated_at: s.updated_at ?? new Date().toISOString(),
    });
    // s.id is an integer in Supabase (e.g. "4") — store the mapping
    shopUuidToId[String(s.id)] = info.lastInsertRowid;
    console.log(
      `     ✓ Shop: ${s.name}  (Supabase id ${s.id} → SQLite id ${info.lastInsertRowid})`,
    );
  }

  // ── 2. CONTAINERS ─────────────────────────────────────────────────────────
  console.log("2/5  Importing containers…");

  const insertContainer = db.prepare(`
    INSERT INTO containers (name, created_at, updated_at)
    VALUES (@name, @created_at, @updated_at)
  `);

  for (const c of rawContainers) {
    const info = insertContainer.run({
      name: c.name,
      created_at: c.created_at ?? new Date().toISOString(),
      updated_at: c.updated_at ?? new Date().toISOString(),
    });
    containerUuidToId[c.id] = info.lastInsertRowid;
    console.log(
      `     ✓ Container: ${c.name}  (UUID …${c.id.slice(-8)} → SQLite id ${info.lastInsertRowid})`,
    );
  }

  // ── 3. BEANS ──────────────────────────────────────────────────────────────
  console.log("3/5  Importing beans…");

  // Build a set of favourite bean UUIDs for quick lookup
  const favouriteUuids = new Set(rawFavorites.map((f) => f.coffee_id));

  // Build a map: bean UUID → container SQLite id (from assignments)
  // If a bean has multiple assignments, we take the most recent one.
  // Sort assignments by assigned_at ascending so the last one wins.
  const sortedAssignments = [...rawAssignments].sort(
    (a, b) => new Date(a.assigned_at) - new Date(b.assigned_at),
  );
  const beanContainerMap = {}; // bean UUID → container UUID
  for (const a of sortedAssignments) {
    beanContainerMap[a.coffee_id] = a.container_id;
  }

  const insertBean = db.prepare(`
    INSERT INTO beans (
      name, shop_id, country, url,
      region, altitude, variety, farm_producer, processing, sca_score,
      notes,
      is_favourite, favourite_order,
      container_id,
      created_at, updated_at
    )
    VALUES (
      @name, @shop_id, @country, @url,
      @region, @altitude, @variety, @farm_producer, @processing, @sca_score,
      @notes,
      @is_favourite, @favourite_order,
      @container_id,
      @created_at, @updated_at
    )
  `);

  const insertRecipe = db.prepare(`
    INSERT INTO bean_recipes (bean_id, shot_type, dose_in_g, yield_out_g, ratio, time_seconds, temp_celsius)
    VALUES (@bean_id, @shot_type, @dose_in_g, @yield_out_g, @ratio, @time_seconds, @temp_celsius)
  `);

  let beanOrder = 0;

  for (const b of rawBeans) {
    // Resolve shop_id — Supabase shop_id is an integer, same as SQLite
    // but we need to look up the new SQLite id from our map
    const sqliteShopId = shopUuidToId[String(b.shop_id)];
    if (!sqliteShopId) {
      console.warn(
        `     ⚠  Bean "${b.name}": shop_id ${b.shop_id} not found in imported shops — skipping bean`,
      );
      continue;
    }

    // Resolve container_id (may be null)
    const containerUuid = beanContainerMap[b.id] ?? null;
    const sqliteContainerId = containerUuid
      ? (containerUuidToId[containerUuid] ?? null)
      : null;

    // Combine flavor description + notes into one notes field
    const noteParts = [b.flavor, b.notes].filter(Boolean);
    const combinedNotes = noteParts.length > 0 ? noteParts.join("\n\n") : null;

    // Altitude: store as text with unit
    const altitudeText = b.altitude_meters ? `${b.altitude_meters} m` : null;

    const isFav = favouriteUuids.has(b.id) ? 1 : 0;

    const info = insertBean.run({
      name: b.name,
      shop_id: sqliteShopId,
      country: b.origin,
      url: b.bean_url ?? null,
      region: b.region ?? null,
      altitude: altitudeText,
      variety: b.botanic_variety ?? null,
      farm_producer: b.farm_producer ?? null,
      processing: b.processing_method ?? null,
      sca_score: parseFloat2(b.sca) ?? null,
      notes: combinedNotes,
      is_favourite: isFav,
      favourite_order: isFav ? beanOrder++ : 0,
      container_id: sqliteContainerId,
      created_at: b.created_at ?? new Date().toISOString(),
      updated_at: b.updated_at ?? new Date().toISOString(),
    });

    const sqliteBeanId = info.lastInsertRowid;
    beanUuidToId[b.id] = sqliteBeanId;

    console.log(
      `     ✓ Bean: ${b.name}${isFav ? " ♥" : ""}${sqliteContainerId ? ` [CTR ${sqliteContainerId}]` : ""}`,
    );

    // Insert recipe (double shot) if any recipe data exists
    const hasRecipe =
      b.recipe_in_grams ||
      b.recipe_out_grams ||
      b.recipe_time_seconds ||
      b.recipe_temperature_c;
    if (hasRecipe) {
      insertRecipe.run({
        bean_id: sqliteBeanId,
        shot_type: "double",
        dose_in_g: parseFloat2(b.recipe_in_grams),
        yield_out_g: parseFloat2(b.recipe_out_grams),
        ratio: b.recipe_ratio ?? null,
        time_seconds: parseTime(b.recipe_time_seconds),
        temp_celsius: parseFloat2(b.recipe_temperature_c),
      });
      console.log(
        `          └─ Recipe: ${b.recipe_in_grams}g → ${b.recipe_out_grams}g, ${b.recipe_time_seconds}s @ ${b.recipe_temperature_c}°C`,
      );
    }
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log("\n4/5  Verifying counts…");
  const counts = {
    shops: db.prepare("SELECT COUNT(*) as c FROM shops").get().c,
    containers: db.prepare("SELECT COUNT(*) as c FROM containers").get().c,
    beans: db.prepare("SELECT COUNT(*) as c FROM beans").get().c,
    recipes: db.prepare("SELECT COUNT(*) as c FROM bean_recipes").get().c,
    favourites: db
      .prepare("SELECT COUNT(*) as c FROM beans WHERE is_favourite = 1")
      .get().c,
  };

  console.log(`     Shops:      ${counts.shops}`);
  console.log(`     Containers: ${counts.containers}`);
  console.log(
    `     Beans:      ${counts.beans}  (${counts.favourites} favourites)`,
  );
  console.log(`     Recipes:    ${counts.recipes}`);
}); // end transaction

// Run it
try {
  run();
  console.log(
    "\n✅  Import complete! Restart the backend and refresh the browser.\n",
  );
} catch (err) {
  console.error(
    "\n❌  Import failed — database has been rolled back, nothing was changed.",
  );
  console.error("    Error:", err.message, "\n");
  process.exit(1);
}
