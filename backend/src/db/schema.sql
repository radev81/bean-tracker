-- ============================================================
--  bean · Coffee Beans Tracker · SQLite Schema
-- ============================================================
--  Stack : Node + Express + SQLite (better-sqlite3) in Docker
--  Target: DS220+ NAS
-- ============================================================

PRAGMA journal_mode = WAL;       -- concurrent reads during writes
PRAGMA foreign_keys = ON;        -- enforce all FK constraints


-- ────────────────────────────────────────────────────────────
--  SHOPS
--  • Created implicitly when a bean card is saved with a new
--    shop name (CB-36, CB-60), or directly via the Shops tab.
--  • Persist in DB even after all their bean cards are deleted
--    (CB-71: shop must remain in the shops list).
--  • Name is case-insensitive unique (CON-06 / SH-06 pattern).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shops (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  url        TEXT,                          -- optional shop homepage
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);


-- ────────────────────────────────────────────────────────────
--  CONTAINERS
--  • Added/renamed via the Containers tab.
--  • Name must be unique (CON-06, CON-14).
--  • Removing a container unassigns its bean (CON-21) — handled
--    by SET NULL on beans.container_id.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS containers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);


-- ────────────────────────────────────────────────────────────
--  BEANS  (main coffee-beans card)
--
--  Required fields (CB-27 / CB-55):  name, shop_id, country
--  Optional fields:  everything else
--
--  Container assignment rules:
--    • One container holds at most one bean at a time.
--      Enforced by UNIQUE(container_id).
--    • A bean may be unassigned (container_id IS NULL).
--    • Deleting a container → SET NULL (CON-21).
--
--  Shop rules:
--    • shop_id is required; RESTRICT prevents deleting a shop
--      while beans still reference it (shops are managed
--      separately; the UI never exposes a "delete shop" action
--      that would leave orphaned beans).
--
--  Favourite ordering:
--    • is_favourite drives sort: favourites first (CB-52).
--    • favourite_order lets the user reorder within favourites
--      if that feature is added later; default to 0.
--
--  Duplicate-name warning (CB-32):
--    • Intentionally NOT enforced at DB level. The warning is
--      a UI guard; the user can save a duplicate after
--      acknowledging it. Use a covering query in the API layer.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,

  -- basics (required)
  name             TEXT    NOT NULL,
  shop_id          INTEGER NOT NULL
                     REFERENCES shops(id)
                     ON UPDATE CASCADE
                     ON DELETE RESTRICT,
  country          TEXT    NOT NULL,

  -- basics (optional)
  url              TEXT,                    -- link to product page

  -- origin
  region           TEXT,
  altitude         TEXT,                   -- free text e.g. "1,800–2,200 m"
  variety          TEXT,
  farm_producer    TEXT,
  processing       TEXT,                   -- Washed / Natural / Honey …
  sca_score        REAL,                   -- 0–100, quarter-point precision

  -- flavour
  notes            TEXT,                   -- free-text tasting / brew notes

  -- status
  is_favourite     INTEGER NOT NULL DEFAULT 0
                     CHECK (is_favourite IN (0, 1)),
  favourite_order  INTEGER NOT NULL DEFAULT 0,   -- lower = higher in list

  -- container (one-to-one; nullable)
  container_id     INTEGER UNIQUE
                     REFERENCES containers(id)
                     ON UPDATE CASCADE
                     ON DELETE SET NULL,   -- unassign on container removal

  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);


-- ────────────────────────────────────────────────────────────
--  BEAN_FLAVOUR_TAGS
--  • Each bean may have 0–N tags (e.g. "Jasmine", "Bergamot").
--  • sort_order preserves the user's tag order in the UI.
--  • Cascade-delete when the parent bean is deleted (CB-69/70).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bean_flavour_tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  bean_id    INTEGER NOT NULL
               REFERENCES beans(id)
               ON DELETE CASCADE,
  tag        TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);


-- ────────────────────────────────────────────────────────────
--  BEAN_RECIPES  (espresso recipe per shot type)
--  • Each bean stores up to two recipes: 'single' and 'double'.
--  • UNIQUE(bean_id, shot_type) enforces the one-per-type rule.
--  • ratio stored as TEXT (e.g. "1:2", "1:2.2") since it is
--    display-only; no arithmetic needed.
--  • All measurement fields are nullable — a recipe row may
--    be partially filled.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bean_recipes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bean_id       INTEGER NOT NULL
                  REFERENCES beans(id)
                  ON DELETE CASCADE,
  shot_type     TEXT    NOT NULL
                  CHECK (shot_type IN ('single', 'double')),
  dose_in_g     REAL,              -- grams in  (e.g. 18)
  yield_out_g   REAL,              -- grams out (e.g. 36)
  ratio         TEXT,              -- e.g. "1:2"
  time_seconds  INTEGER,           -- extraction time
  temp_celsius  REAL,              -- brew temperature

  UNIQUE (bean_id, shot_type)
);


-- ============================================================
--  INDEXES
-- ============================================================

-- Fast favourite-first list rendering (CB-52)
CREATE INDEX IF NOT EXISTS idx_beans_favourite
  ON beans (is_favourite DESC, favourite_order ASC, name ASC);

-- Filtering by shop (CB-15)
CREATE INDEX IF NOT EXISTS idx_beans_shop
  ON beans (shop_id);

-- Filtering by country of origin (CB-18)
CREATE INDEX IF NOT EXISTS idx_beans_country
  ON beans (country);

-- Searching by name (CB-04)
CREATE INDEX IF NOT EXISTS idx_beans_name
  ON beans (name COLLATE NOCASE);

-- Tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_bean
  ON bean_flavour_tags (bean_id);

-- Recipe lookups
CREATE INDEX IF NOT EXISTS idx_recipes_bean
  ON bean_recipes (bean_id);


-- ============================================================
--  TRIGGERS  –  keep updated_at current
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trg_shops_updated
  AFTER UPDATE ON shops
  FOR EACH ROW
  BEGIN
    UPDATE shops SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_containers_updated
  AFTER UPDATE ON containers
  FOR EACH ROW
  BEGIN
    UPDATE containers SET updated_at = datetime('now') WHERE id = OLD.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_beans_updated
  AFTER UPDATE ON beans
  FOR EACH ROW
  BEGIN
    UPDATE beans SET updated_at = datetime('now') WHERE id = OLD.id;
  END;


-- ============================================================
--  VIEWS  (convenience; not required by app but useful for
--          debugging and future reporting)
-- ============================================================

-- Full bean card with shop name and container name resolved
CREATE VIEW IF NOT EXISTS v_beans AS
SELECT
  b.id,
  b.name,
  b.is_favourite,
  b.favourite_order,
  s.name        AS shop_name,
  s.url         AS shop_url,
  b.url,
  b.country,
  b.region,
  b.altitude,
  b.variety,
  b.farm_producer,
  b.processing,
  b.sca_score,
  b.notes,
  c.id          AS container_id,
  c.name        AS container_name,
  b.created_at,
  b.updated_at
FROM      beans      b
LEFT JOIN shops      s ON s.id = b.shop_id
LEFT JOIN containers c ON c.id = b.container_id;

-- Container list with occupancy status
CREATE VIEW IF NOT EXISTS v_containers AS
SELECT
  c.id,
  c.name,
  b.id    AS bean_id,
  b.name  AS bean_name,
  CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_occupied,
  c.created_at,
  c.updated_at
FROM      containers c
LEFT JOIN beans      b ON b.container_id = c.id;

-- Shop list with bean count (used by Shops tab badge)
CREATE VIEW IF NOT EXISTS v_shops AS
SELECT
  s.id,
  s.name,
  s.url,
  COUNT(b.id) AS bean_count,
  s.created_at,
  s.updated_at
FROM      shops s
LEFT JOIN beans b ON b.shop_id = s.id
GROUP BY  s.id;


-- ============================================================
--  SUPABASE → SQLITE MIGRATION NOTES
-- ============================================================
--
--  Map Supabase (PostgreSQL) types to SQLite equivalents:
--
--  Supabase type   │ SQLite type   │ Notes
--  ────────────────┼───────────────┼──────────────────────────
--  uuid            │ TEXT          │ keep as string; generate
--                  │               │ with crypto.randomUUID()
--                  │               │ or switch to INTEGER PK
--  text / varchar  │ TEXT          │ direct
--  int4 / int8     │ INTEGER       │ direct
--  float4 / float8 │ REAL          │ direct
--  bool            │ INTEGER 0/1   │ SQLite has no bool type
--  timestamptz     │ TEXT ISO-8601 │ store as datetime('now')
--  jsonb / json    │ TEXT          │ JSON.stringify on write,
--                  │               │ JSON.parse on read
--  text[]          │ bean_flavour_ │ normalise into child table
--                  │ tags rows     │ (already done above)
--
--  If your Supabase schema used UUIDs as primary keys:
--    Option A – keep TEXT PKs (zero-risk, slightly larger DB)
--    Option B – re-key to INTEGER AUTOINCREMENT (smaller, faster
--               lookups; requires remapping all FKs in export)
--
--  Migration script outline (run once on the host):
--    1. pg_dump --data-only --inserts supabase_db > dump.sql
--    2. sed / awk to rewrite types (uuid→quoted string, etc.)
--    3. sqlite3 bean.db < schema.sql
--    4. sqlite3 bean.db < transformed_dump.sql
--    5. PRAGMA integrity_check;
--
-- ============================================================
