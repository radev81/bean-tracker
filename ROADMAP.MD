# Beans Tracker · Project Roadmap

Single source of truth for the build plan. Reference this at the start of every new conversation.

---

## Architecture

```
Phone / browser
      │  HTTPS (port 3200)
      ▼
Caddy — SSL termination, reverse proxy (shared NAS instance, port 3200)
      │  HTTP (port 3201 → container port 3000)
      ▼
bean-tracker container — single Docker container on DS220+
      ├── Express serves React SPA (built frontend in /public)
      ├── Express API routes (/api/beans, /api/containers, /api/shops)
      └── SQLite file (/data/bean.db, bind-mounted from NAS)

Auth:
      Browser → Logto (port 3301, shared NAS instance)
             → /callback → app
      API calls carry Bearer JWT → backend validates against Logto JWKS
```

**Key facts:**

- Frontend and backend live in a single Docker container — Express serves the built React app as static files
- Auth handled by Logto (shared with other NAS apps) — JWT Bearer tokens, no session cookies for API calls
- The app lives under the `/beans/` sub-path: `https://ra-homelab.synology.me:3200/beans/`
- QR codes are plain URLs: `https://ra-homelab.synology.me:3200/beans/container/1` (copy one from Containers → ⋯ → "Copy QR code link")
- The `.db` file never goes into Git — bind-mounted from `/volume1/docker/bean-tracker/data/`
- Caddy handles HTTPS using the shared Synology certificate
- No Nginx container, no Authelia container, no GitHub Pages deployment

---

## Stack

| Layer         | Choice                  | Notes                                              |
| ------------- | ----------------------- | -------------------------------------------------- |
| Frontend      | React + Vite            | No CSS framework — plain CSS with variables        |
| Routing       | React Router            | `basename` = Vite base `/beans`; routes below it    |
| Backend       | Node + Express (ESM)    | REST API + serves built frontend as static files   |
| Database      | SQLite (better-sqlite3) | Single `.db` file, WAL mode                        |
| Auth          | Logto                   | Shared NAS instance, OIDC/JWT Bearer tokens        |
| Reverse proxy | Caddy                   | Shared NAS instance, Synology certificate          |
| DDNS          | Synology built-in       | ra-homelab.synology.me → home IP                   |
| NAS           | Synology DS220+         | Docker + Container Manager already installed       |
| IDE           | VS Code (Windows 11)    | Extensions: ESLint, Prettier, GitLens, REST Client |

---

## Design

**Theme:** Dial — November 2026 (replaces Neon Espresso)
**Inspiration:** the round gauge screen of an espresso machine — dark, monochrome, one round readout per screen, one signal colour.
**Reference:** design canvas "Bean Log — specialty coffee tracker UX" (claude.ai artifact) — 8 phone screens + design-language board
**Plan and rationale:** `claude/UX-MIGRATION-PLAN.md` in the claude.ai project

### Tokens (`frontend/src/index.css` — source of truth; `theme.js` mirrors them)

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--ground` | `#0B0B0A` | `#F4F1EA` | page background |
| `--face` | `#121211` | `#FFFFFF` | cards, dial faces |
| `--raised` | `#161614` | `#FAF8F3` | sheets, selected tiles |
| `--line` | `#2A2A27` | `#E2DDD2` | borders, dial track |
| `--line-hi` | `#3A3935` | `#CFC8BA` | stronger borders, minor ticks |
| `--ink` | `#F3EFE6` | `#141311` | text **and primary buttons** |
| `--ink-2` | `#D9D4C8` | `#3F3B35` | secondary text |
| `--muted` | `#A39E93` | `#6B665D` | labels, metadata (≥ 4.5:1) |
| `--ghost` | `#4A4844` | `#C9C3B7` | inactive icons |
| `--signal` | `#F2A65A` | `#B8661A` | the one accent: live / selected / suggestion |
| `--on-ink` | `#0B0B0A` | `#FAF8F3` | text on ink buttons |
| `--danger` / `--on-danger` | `#E06A4E` / `#0B0B0A` | `#B4402A` / `#FFFFFF` | delete / remove |

Radii: cards `--r-card` 20px · sheets `--r-sheet` 28px · inputs `--r-input` 14px · buttons, chips, badges 999px (pills).
The old names (`--color-*`, `--accent-*`, `--grad*`, `--blue*`) still exist as aliases onto the new palette — new code uses the short names.

### Typography

- **Font:** Manrope (Google Fonts), `font-variant-numeric: tabular-nums` on `body`
- **300** — big dial readouts and numbers (ratio, recipe values, SCA, counts)
- **500** — page titles (30px), bean names
- **600** — primary buttons, small-caps labels (11px, `letter-spacing: 0.14em`, uppercase)
- **400** — body text
- Inputs are 16px so iOS doesn't zoom in on focus

### Building blocks (`frontend/src/components/ui/`)

| Component | What it is |
|---|---|
| `Dial` | 270° round gauge: ticks, value arc, optional knob, optional coloured `rimColor`; read-only or interactive (drag, ±, arrow keys — a `role="slider"`) |
| `RingBadge` | small circle with a number/initial; ring colour or progress arc |
| `containerColor()` | ring colour from a colour word in a container name (EN / ES / NL) |
| `BottomNav` | Beans · Containers · (+) · Shops; optional Shots tab |
| `Sheet` | bottom sheet (centred on desktop); Esc / backdrop / × close |
| `Button`, `Chip`, `Segmented`, `Field`, `PageHeader`, `SectionLabel` | controls in `controls.jsx` |
| `AccountButton` | opens the account sheet (theme + sign out) via `ShellContext` |
| `icons.jsx` | stroke icons — no emoji in the UI |

### Key UI rules

- One main number per screen, on a dial or as a light 300-weight readout
- Primary actions are **ink** pills (cream on dark, near-black on light); amber `--signal` only marks what is live, selected or suggested
- Bottom navigation on the three main tabs; full-screen pages (bean, edit, dial-in, QR) have a back button and no bottom bar
- Each page draws its own header: small-caps eyebrow (counts) + 30px title + actions (New, account)
- Container colour (from its name) appears as ring colour everywhere: list rows, container cards, form tiles, hero dial rim
- Touch targets ≥ 44px; visible focus ring in `--signal`; respects `prefers-reduced-motion`
- Theme: dark by default; `localStorage` key `bt-theme`, applied to `<html data-theme>` before React loads (no flash)
- Other device-local preferences: `bt-shop-sort` (Shops sort), `bt-hero-container` (container shown on the Beans dial)

---

## BDD Scenario Catalogue

Full specification: `docs/scenario-catalogue.html` (also in the claude.ai project). Open it in a browser; "Show only Nov 2026 changes" lists what the Dial redesign changed.

**150 scenarios across 3 sections** (Nov 2026; was 102):

- **Coffee Beans (CB-01 – CB-108):** list, search, filtering + quick chips, container dial, add, bean page (replaces card expand/collapse), favourites, edit, dial-in, import bean details (CB-95 – CB-104), delete, QR code (public visitor view: CB-105 – CB-108)
- **Containers (CON-01 – CON-28):** list, add, rename, remove, filling a container
- **Shops (SH-01 – SH-14):** list, sort, show a shop's beans, add, edit, remove

---

## Database Schema

Full schema: `backend/src/db/schema.sql`

**Tables:** `shops`, `containers`, `beans`, `bean_flavour_tags`, `bean_recipes`
**Views:** `v_beans`, `v_containers`, `v_shops`

Key rules:

- One container holds at most one bean (UNIQUE constraint on `container_id`)
- Shops persist even after all their bean cards are deleted (CB-71)
- Duplicate bean name is a UI warning only — not enforced at DB level (CB-32)
- `is_favourite` drives sort order: favourites first (CB-52)
- Deleting a container → SET NULL on `beans.container_id` (CON-21)
- Deleting a shop blocked by DB if beans still reference it (ON DELETE RESTRICT)

---

## Phase Status

### 🔄 Phase 14 — Public container pages (November 2026)

Anyone can scan a container's QR code and see what's in it **without an account**. The existing links keep working (`…/beans/container/1`), so printed QR codes don't change. Branch `feature/public-container-page`.

**How it works**
- **Backend:** new public, read-only route `GET /api/public/containers/:id` (`backend/src/routes/public.js`), mounted in `index.js` **before** the protected routes. It returns the container (number, name) and its bean: name, shop name, country, region, altitude, variety, process, producer, SCA score, tasting notes, flavour tags and recipes. **Not returned:** bean/shop ids, product links, favourites, timestamps. No write routes. `Cache-Control: no-store`.
- **Frontend:** when not signed in, `App.jsx` renders only `/container/:id` (as `ContainerQRPage` with `publicView`) and the sign-in screen for every other path. The visitor view hides Open bean / Dial in / Fill / Add, adds origin details and tasting notes, and a "Sign in" link.
- **Back after sign-in:** `authReturn.js` remembers the page in `sessionStorage` (`bt-return-to`) when "Sign in" is tapped; `Root.jsx` returns there after the Logto callback (only paths under `/beans/` are accepted).
- **No changes** to Logto, Caddy, Docker or the database.

**Trade-off (accepted):** container numbers are sequential, so anyone who knows the link pattern can try other numbers. Only coffee details are exposed. Unguessable links would need a new column and reprinted QR codes.

| File | Change |
|---|---|
| `backend/src/routes/public.js` | **New** — public read-only container route |
| `backend/src/index.js` | Mount `/api/public` before the protected routes |
| `frontend/src/api.js` | `fetchPublicContainer(id)` — no token |
| `frontend/src/authReturn.js` | **New** — remember / restore the page across sign-in |
| `frontend/src/App.jsx` | Signed-out routes: container page or sign-in |
| `frontend/src/Root.jsx` | Return to the remembered page after sign-in |
| `frontend/src/pages/ContainerQRPage.jsx` / `.css` | `publicView` mode, origin + tasting notes, sign-in link |
| `docs/scenario-catalogue.html` | CB-105 – CB-108 (150 scenarios) |

---

### 🔄 Phase 13 — Import bean from shop page (November 2026)

Add a new bean by importing its details from the shop's product page instead of typing them.

**Stage 1 — done on branch `feature/bean-import` (frontend only, no backend or database changes):**

1. **Claude skill `bean-import`** (saved in the user's Claude account): give it a product-page URL (or paste the page text if the site blocks fetching) → it returns ONE JSON object in the `POST /api/beans` shape, as a code block and a `.json` file. Rules: never guess (missing → key left out); country, process and flavour tags in English; tasting notes in the page's language; `shop_name` from the Shops list (domain → shop table in the skill); only the roaster's espresso recipe, as `shot_type: "double"`; time ranges → lower value, full range in recipe notes.
2. **"Import bean details"** button on the new-bean page → sheet with paste box, Paste button (when the browser allows clipboard access) and `.json` upload → **Fill the form**. The JSON is validated first (`frontend/src/beanImport.js`): invalid JSON, unknown fields, wrong types and non-double recipes give a clear error list. Only fields in the JSON are filled; shop spelling is matched to the Shops list; a banner shows what was imported and what's still needed. Nothing is saved until you tap Save bean; the container is always picked in the form (a `container_id` in the JSON is ignored).

**Import JSON format** (all keys optional; unknown keys are rejected):

```json
{
  "name": "Rwenzori Mountains",
  "shop_name": "Ineffable",
  "country": "Uganda",
  "region": "Rwenzori",
  "altitude": "1400 - 2000 m",
  "variety": "SL28, SL14",
  "processing": "Washed",
  "farm_producer": "Pequeños productores",
  "sca_score": 85,
  "url": "https://ineffablecoffee.com/products/rwenzori-mountains",
  "notes": "Tasting notes in the page's language…",
  "flavour_tags": ["White Chocolate", "Pear", "Almond"],
  "recipes": [{ "shot_type": "double", "dose_in_g": 18, "yield_out_g": 38,
                "time_seconds": 30, "temp_celsius": 94, "notes": "…" }]
}
```

Text fields: string or null · `sca_score`: number 0–100 · `flavour_tags`: list of strings · `recipes`: at most one, `shot_type` must be `"double"`, numbers ≥ 0, `ratio` is ignored (the form calculates it). `container_id`, `skipDuplicateCheck`, `replaceContainer` are accepted but ignored.

| File | Change |
|---|---|
| `frontend/src/beanImport.js` | **New** — `parseBeanImport(text)`: extracts the `{…}` from pasted text (```json fences, curly quotes), validates, returns a clean bean or a list of errors |
| `frontend/src/components/beans/BeanImportSheet.jsx` | **New** — the import sheet (paste box, Paste, Choose .json file) |
| `frontend/src/components/beans/BeanForm.jsx` | Import button (new beans only), `applyImport()`, review banner |
| `frontend/src/components/beans/BeanForm.css` | `.bfm-import__*`, `.bfm-imported` styles |
| `frontend/src/components/ui/icons.jsx` | `ImportIcon` |
| `docs/scenario-catalogue.html` | CB-95 – CB-104 "Importing bean details" (146 scenarios) |

Tested on: Ineffable *Rwenzori Mountains* (recipe as text), Nomad *Timbuyacu* (recipe only as an image), Hidden *Tembo* (filter coffee, no espresso recipe) — all three JSONs pass the app's validator.

**Stage 2 (later):** paste only the URL in the form; the NAS fetches the page and produces the same JSON (backend route, same `parseBeanImport` checks on the result).

---

### ✅ Phase 12 — Dial UX redesign (November 2026)

New look and navigation for the whole frontend. **No backend, database or deployment changes.** Deployed to the NAS on 5 Nov 2026.

| Commit | What |
|---|---|
| `f5f0c61` | `.gitattributes` — store text files with LF (stops Windows CRLF noise) |
| `568a6a1` | Dial design tokens + Manrope font (old token names kept as aliases) |
| `437a98d` | UI building blocks (`components/ui/`) + **router fix**: `BrowserRouter basename` = `/beans`, so refreshing on Containers/Shops and QR links work |
| `27c5eb0` | Bottom navigation, account sheet, add/edit bean pages |
| `e92cbf0` | All screens rebuilt (Beans + container dial, bean page, dial-in, form, Containers, Shops, QR page); 409 conflict dialogs fixed |
| `748009b` | Temporary `/kit` preview page removed |

**Routes** (all under `/beans/`): `/` beans · `/containers` · `/shops` · `/new` · `/bean/:id` · `/bean/:id/edit` · `/bean/:id/dial` · `/container/:id` (QR)

**Bug fixes found on the way:**
- `api.js` now keeps the server reply on errors (`error.data`). Before, 409 conflicts lost their details, so the duplicate-name and container-in-use dialogs never appeared and saving failed silently.
- The bean count in the header updates after adding/deleting.
- QR page used undefined CSS variables (old Mocha names) — fixed.
- Whole frontend passes ESLint.

**Follow-ups (Nov 2026):** search clear button (CB-06/08) and discard-changes dialog when renaming a container (CON-11–13) restored to match the spec; `backups/` and database files excluded in `.gitignore` / `.dockerignore`.

**Possible next steps (need small, additive backend changes — back up `bean.db` first):** roast date + bag size (days-off-roast dial), single-shot recipe saving, grind setting, shot log (`shots` table) with dial-in map. See `claude/UX-MIGRATION-PLAN.md`, "Phase B".

---

### ✅ Espresso recipe notes field

Added a free-text **Notes** textarea to the Espresso Recipe section of BeanForm (below the auto-calculated Ratio). Notes are stored in `bean_recipes.notes` (TEXT, nullable).

**Files changed:**

| File | Change |
|------|--------|
| `backend/src/db/schema.sql` | Added `notes TEXT` to `bean_recipes` CREATE TABLE |
| `backend/src/db/database.js` | `PRAGMA table_info` migration — adds column to existing DB on startup |
| `backend/src/routes/beans.js` | Added `notes` to recipe INSERT (POST) and upsert (PUT) |
| `frontend/src/components/beans/BeanForm.jsx` | New `recipeNotes` state, pre-filled in edit mode, included in `hasChanges`, `currentFields`, `buildPayload`, and rendered as textarea |
| `frontend/src/components/beans/BeanCard.jsx` | `RecipeSection` now renders `notes` below the recipe row (both single and double paths) |
| `frontend/src/components/beans/BeanCard.css` | Added `.bc-recipe__notes` style |

---

### ✅ Phase 11 — Swipe-to-reveal actions on bean cards

> Done in April 2026 and carried into the Dial redesign: the bean **list rows** now swipe (140 px strip, Edit | Delete); BeanCard no longer exists. The hook `useSwipeReveal.js` was simplified (position follows `isOpen` when not dragging).

Touch-only swipe left on a collapsed BeanCard to reveal **Edit** and **Delete** action buttons behind the card header.

#### Behaviour spec
- Swipe left on a **collapsed** card → reveals a 120 px action strip (Edit | Delete)
- Only one card swiped open at a time — swiping a new card auto-closes the previous one
- Swipe is **disabled** when a card is expanded; Edit / Delete in the expanded body are used instead
- Expanding a swiped-open card closes the swipe panel first
- Delete from the swipe strip triggers the **same confirmation dialog** as the expanded-body Delete button
- **Touch only** — mouse / pointer events leave desktop behaviour unchanged
- Snap threshold: 44 px drag distance **or** 0.3 px/ms swipe velocity → snaps open; otherwise snaps back

#### Files

| File | Change |
|------|--------|
| `frontend/src/components/beans/useSwipeReveal.js` | **New** — touch event hook, direction detection, drag offset, snap logic |
| `frontend/src/components/beans/BeanCard.jsx` | Add swipe track wrapper + revealed action strip; `isSwipeOpen` / `onSwipeOpen` / `onSwipeClose` props |
| `frontend/src/components/beans/BeanCard.css` | Track / panel layout, header z-index, action strip button styling |
| `frontend/src/components/beans/BeanList.jsx` | `swipeOpenId` state; pass swipe props to every BeanCard |

---

### 🔲 Phase 10 — PWA (DRAFT)

Make Beans Tracker installable on mobile and desktop with offline app-shell caching.

#### Goals
- Installable on iOS/Android home screen and desktop Chrome
- App shell (HTML/CSS/JS/fonts) loads from cache — works even when NAS is unreachable
- API calls always go to network (no stale bean data)
- Correct theme colour and splash screen on all platforms

#### Files to create

| File | Purpose |
|------|---------|
| `frontend/public/icon-192.png` | Standard app icon |
| `frontend/public/icon-512.png` | Large app icon (splash screen, app store) |
| `frontend/public/icon-maskable.png` | Maskable icon for Android adaptive icons — safe zone is inner 80% |
| `frontend/public/apple-touch-icon.png` | iOS home screen icon — 180×180px, no transparency |

All icons should use the Dial ground colour (`#0B0B0A`) as background with a cream (`#F3EFE6`) bean or cup mark centred in the safe zone. `site.webmanifest` already uses `#0B0B0A` for `theme_color` and `background_color`. Note the app is served under `/beans/`, so `start_url`, `scope`, icon paths and the `navigateFallback` must include that prefix.

#### Files to modify

**`frontend/package.json`**
- Add dev dependency: `vite-plugin-pwa`

**`frontend/vite.config.js`**
- Import and configure `VitePWA`:
```js
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-*.png'],
  manifest: {
    name: 'Beans Tracker',
    short_name: 'Beans',
    description: 'Coffee bean collection manager',
    theme_color: '#6a3828',
    background_color: '#f4f2ee',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'icon-192.png',   sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png',   sizes: '512x512', type: 'image/png' },
      { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    navigateFallback: '/index.html',
    runtimeCaching: [
      {
        // Never cache API calls — always fetch fresh data
        urlPattern: /^\/api\//,
        handler: 'NetworkOnly',
      },
      {
        // Never cache Logto — auth always needs network
        urlPattern: /ra-homelab\.synology\.me:3301/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'google-fonts-stylesheets' },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
})
```

**`frontend/index.html`**
- Fix page title: `<title>Beans Tracker</title>`
- Add meta tags inside `<head>`:
```html
<meta name="theme-color" content="#6a3828">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Beans">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
- Remove the dead `<script>` block after `</html>` — this was the GitHub Pages redirect hack, no longer needed

**`frontend/src/index.css`**
- Add to `body`:
```css
overscroll-behavior: none;          /* prevent bounce scroll on iOS */
padding: env(safe-area-inset-top) env(safe-area-inset-right)
         env(safe-area-inset-bottom) env(safe-area-inset-left);
```
- Ensure all `input`, `select`, `textarea` have `font-size: 16px` minimum — prevents iOS auto-zoom on focus

#### Notes
- The Logto `/callback` route works correctly through the service worker because `navigateFallback` serves `index.html`, and `useHandleSignInCallback` in `main.jsx` handles the rest client-side
- On iOS, PWA install is via Share → Add to Home Screen (no browser install prompt)
- On Android/Chrome, the browser will show an install banner automatically once manifest + SW are valid
- Service worker only activates in production build (`vite build`) — `npm run dev` bypasses it

---

### ✅ Phase 0 — Dev environment

- Node.js v24, npm v11, Git v2.53 installed
- VS Code with ESLint, Prettier, GitLens, REST Client
- GitHub CLI authenticated
- Git configured with name and email

### ✅ Phase 1 — Project structure

- Monorepo: `bean-tracker/frontend/` + `bean-tracker/backend/`
- Frontend: React + Vite, React Router installed
- Backend: Express, better-sqlite3, cors, dotenv, nodemon installed
- `.gitignore` updated to exclude `node_modules/`, `dist/`, `.env`, `*.db`, `backend/data/import/`
- Initial commit pushed to GitHub (public repo: `bean-tracker`)

### ✅ Phase 2 — Backend API skeleton

- `backend/src/db/schema.sql` — full SQLite schema
- `backend/src/db/database.js` — connection + schema auto-apply on startup
- `backend/src/routes/beans.js` — full CRUD + favourite toggle + tags + recipes
- `backend/src/routes/containers.js` — full CRUD + GET current-bean (QR page)
- `backend/src/routes/shops.js` — full CRUD
- `backend/src/index.js` — Express server, CORS, health check at `/api/health`
- `backend/.env` — `PORT=3001`, `ALLOWED_ORIGIN=http://localhost:5173`
- All routes tested with REST Client

### ✅ Design — Mocha Deep locked (superseded: Neon Espresso, Apr 2026 → Dial, Nov 2026)

- 4 design concept rounds explored
- Final design: light minimal catalog aesthetic, Outfit font, Mocha Deep gradient accent
- Design reference committed: `frontend/public/design-reference.html`
- Scenario catalogue committed: `frontend/public/scenario-catalogue.html` *(now `docs/scenario-catalogue.html`)*

### ✅ Phase 8 — Supabase data migration (done early)

- Exported 5 tables from Supabase as CSV: `coffee_beans`, `shops`, `containers`, `coffee_container_assignments`, `user_coffee_favorites`
- Wrote one-time `import.js` script mapping Supabase schema → SQLite schema
- Handled: UUID → integer ID remapping, recipe columns → `bean_recipes` table, favourites column, container assignments column, time ranges (e.g. "29-30" → 29)
- Ran script: 33 beans, shops, containers, and recipes imported successfully
- `import.js` and `backend/data/import/` added to `.gitignore` and removed from Git tracking
- `bean.db` copied to Docker volume on NAS via `docker cp` after fixing permissions and removing conflicting WAL files

### ✅ Phase 3 — React frontend (COMPLETE)

1. ✅ `frontend/src/theme.js` — CSS variable token file
2. ✅ App shell — `App.jsx`, `App.css`, routing, global layout, tab bar
3. ✅ `frontend/src/index.css` — global reset + CSS custom properties
4. ✅ `frontend/src/api.js` — centralised fetch wrapper (VITE_API_URL from .env)
5. ✅ `frontend/src/main.jsx` — entry point, BrowserRouter wrapper with `basename="/bean-tracker"`
6. ✅ `EmptyState.jsx` — reusable empty state component
7. ✅ `Dialog.jsx` — reusable dialog component (common/)
8. ✅ `BeanList.jsx` — CB-01, CB-02 (empty state + list)
9. ✅ `BeanCard.jsx` — CB-42–CB-46 (expand/collapse), CB-47–CB-52 (favourite toggle)
10. ✅ `BeanSearch.jsx` — CB-03–CB-08 (search + clear)
11. ✅ `BeanFilter.jsx` — CB-09–CB-24 (filter panel)
12. ✅ `BeanForm.jsx` — CB-25–CB-41 (add new card), CB-53–CB-66 (edit flow)
13. ✅ Delete flow — CB-67–CB-71 (DELETE /api/beans/:id)
14. ✅ `ContainerQRPage.jsx` — CB-72, CB-73 (QR scan route, standalone — no header/tabs)
15. ✅ `ContainerList.jsx` — CON-01–CON-21 (list, add, edit, remove)
16. ✅ `ShopList.jsx` — SH-01–SH-08 + edit and remove (beyond spec)

**App routing notes:** *(updated Nov 2026 — see Phase 12 for the current routes)*

- Full-screen routes (`/container/:id`, `/new`, `/bean/:id`, `/bean/:id/edit`, `/bean/:id/dial`) bypass AppShell (no bottom navigation)
- `/`, `/containers` and `/shops` render inside AppShell via the React Router layout route pattern
- Components folder is `frontend/src/components/common/` (not shared/); design-system pieces in `components/ui/`
- `BrowserRouter` uses `basename={import.meta.env.BASE_URL}` without the trailing slash → `/beans`

**API notes:**

- `apiFetch` always throws on non-ok responses, with `error.status` set
- 409 responses are caught in component `catch` blocks; the server's JSON is on `error.data` (e.g. `{ conflict: "duplicate_name", existingBean }`)
- `VITE_API_URL` must NOT include `/api` suffix — api.js appends route paths directly

### ✅ Phase 5 — Docker on the NAS (COMPLETE)

- `backend/Dockerfile` — Node 24 slim image, production dependencies only
- `docker-compose.yml` — api + nginx services, bean-data named volume, bean-net internal network
- `nginx/nginx.conf` — reverse proxy on port 8080 (port 80 reserved by DSM)
- Repo cloned to `/volume1/apps/bean-tracker` on DS220+
- `backend/.env` created on NAS via `vi` (not in Git)
- Containers running: `bean-api` + `bean-nginx`

### ✅ Phase 6 — Domain, DDNS & HTTPS (COMPLETE)

- DDNS configured in DSM → Control Panel → External Access → `ra-homelab.synology.me`
- Router port forwarding: 443 → NAS:443, 80 → NAS:80
- SSL certificate obtained via DSM → Control Panel → Security → Certificate (Let's Encrypt)
- DSM Reverse Proxy configured: HTTPS:443 → localhost:8080

### ✅ Phase 7 — GitHub Pages deploy (superseded by Phase 9)

- Frontend was hosted on GitHub Pages at `https://radev81.github.io/bean-tracker/`
- Replaced in Phase 9 — frontend is now served by the backend container

### ✅ Phase 9 — Logto migration (COMPLETE)

Replaced Authelia + Nginx + GitHub Pages with Logto + Caddy + single container.

**What changed:**
- Removed: `nginx/`, `authelia/`, `backend/Dockerfile`, `.github/workflows/deploy.yml`
- Added: root `Dockerfile` (multi-stage, builds frontend + runs backend), `.dockerignore`
- Backend converted to ESM, added `@logto/express`, `jose`, `express-session`, `cookie-parser`
- Backend now serves the built React frontend as static files from `/public`
- Frontend auth: `@logto/react` — `LogtoProvider`, `useHandleSignInCallback`, `useLogto`
- API auth: JWT Bearer tokens validated against Logto JWKS (no more session cookies)
- `frontend/src/api.js` replaced with `createApiClient(getAccessToken)` factory + `ApiContext` + `useApi()` hook
- All components updated to use `useApi()` hook
- Removed `base: '/bean-tracker/'` from vite.config.js — app now runs at root path
- Port: external 3200 (Caddy), NAS internal 3201, container 3000

**Logto registrations:**
- Backend app (Traditional Web): App ID `ry7zxe7m909v1cckpjnjw`
- Frontend app (SPA): App ID `jvn1aty7z9yc0280f7swm`
- API Resource identifier: `https://bean-tracker.api`

**NAS setup:**
- App folder: `/volume1/docker/bean-tracker/`
- Database: `/volume1/docker/bean-tracker/data/bean.db` (bind mount)
- Caddy entry added to `/volume1/docker/logto/Caddyfile` at port 3200
- Router port forwarding: 3200 → NAS:3200

**NAS deployment notes:**
- `nano` not available on Synology — use `vi` instead
- `docker` commands require `sudo` on Synology SSH
- To copy db from local to NAS: `scp -O local/bean.db user@nas:/volume1/docker/bean-tracker/data/bean.db`
- Stop container before copying db to avoid SQLite locking issues

### ✅ Phase 4 — QR codes

- QR code URLs follow the pattern: `https://ra-homelab.synology.me:3200/beans/container/:id` *(corrected Nov 2026 — codes without `/beans` don't open the container page)*
- No code changes needed — handled by `ContainerQRPage.jsx`
- Generate QR codes and print/attach to physical containers as needed

---

## Starting a new conversation

Paste this block at the top of every new conversation:

```
I'm building a coffee beans tracker app called Beans Tracker.

Stack: React + Vite frontend served by a Node + Express + SQLite backend,
deployed as a single Docker container on a Synology DS220+ NAS.
Auth via Logto (shared NAS instance). HTTPS via Caddy (shared NAS instance).

Repo: github.com/radev81/bean-tracker
Structure:
  bean-tracker/
  ├── frontend/   (Vite + React, React Router, @logto/react)
  └── backend/    (Node + Express ESM + SQLite, @logto/express, port 3000)

Design: "Dial" — dark-first, machine-gauge look. Manrope font, ground #0B0B0A,
ink #F3EFE6 (also primary buttons), one signal accent #F2A65A, light theme too.
Round Dial component, bottom navigation (Beans · Containers · + · Shops),
full-screen bean page, dial-in page and QR page.
Tokens: frontend/src/index.css · building blocks: frontend/src/components/ui/
Full BDD scenario catalogue: docs/scenario-catalogue.html
Full build plan: ROADMAP.MD (project root)

Live URL: https://ra-homelab.synology.me:3200/beans/

Current status: All phases complete. App is fully live.

Next task: [describe what to build next]
```

---

## Useful commands

```bash
# Run backend locally
cd backend && npm run dev

# Run frontend locally
cd frontend && npm run dev

# Commit and push
git add .
git commit -m "feat: description"
git push

# On NAS — deploy the latest main (back up the database first)
cd /volume1/docker/bean-tracker
sudo git status                         # must say "nothing to commit"
sudo docker compose stop
sudo mkdir -p backups && sudo cp -p data/bean.db* backups/
sudo git fetch origin
sudo git merge --ff-only origin/main
sudo git --no-pager log --oneline -1    # check you're on the expected commit
sudo docker compose up -d --build
sudo docker inspect bean-tracker --format 'created {{.Created}}'   # should be now

# Tip: git on the NAS has no pager — add --no-pager to log/diff

# On NAS — view live logs
docker logs -f bean-tracker

# On NAS — restart container only (no rebuild)
docker restart bean-tracker

# On NAS — check container status
docker ps

# Copy local db to NAS (stop container first)
scp -O backend/data/bean.db user@nas-ip:/volume1/docker/bean-tracker/data/bean.db
```

---

## File locations quick reference

```
bean-tracker/
├── .gitignore
├── ROADMAP.MD                               ← this file
├── docs/
│   └── scenario-catalogue.html              ← BDD spec (150 scenarios)
├── Dockerfile                               ✅ Phase 9 — multi-stage build
├── .dockerignore                            ✅ Phase 9
├── docker-compose.yml                       ✅ Phase 9 — single service, port 3201:3000
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql                   ✅
│   │   │   └── database.js                  ✅ ESM
│   │   ├── routes/
│   │   │   ├── beans.js                     ✅ full CRUD, ESM
│   │   │   ├── containers.js                ✅ full CRUD + QR endpoint, ESM
│   │   │   ├── shops.js                     ✅ full CRUD, ESM
│   │   │   └── public.js                    ✅ public read-only container route (Phase 14)
│   │   └── index.js                         ✅ Logto auth, static serving, ESM
│   ├── data/                                ← bean.db lives here locally (not in Git)
│   ├── .env                                 ← not in Git
│   ├── test.http
│   └── package.json
└── frontend/
    ├── public/                              ← favicons + site.webmanifest
    ├── src/
    │   ├── theme.js                         ✅ Dial tokens for JS
    │   ├── index.css                        ✅ Dial tokens (source of truth)
    │   ├── api.js                           ✅ createApiClient + ApiContext + useApi
    │   ├── beanUtils.js                     ✅ ratio, host name, full-payload helpers
    │   ├── beanImport.js                    ✅ validate imported bean JSON (Phase 13)
    │   ├── authReturn.js                    ✅ back to the same page after sign-in (Phase 14)
    │   ├── shell.js                         ✅ ShellContext (account sheet)
    │   ├── main.jsx                         ✅ LogtoProvider + basename /beans
    │   ├── Root.jsx                         ✅ sign-in callback
    │   ├── App.jsx                          ✅ auth gate, routes, AppShell
    │   ├── App.css                          ✅ shell + sign-in
    │   ├── pages/
    │   │   ├── BeanDetail.jsx               ✅ CB-42–CB-52, CB-67–CB-71, CB-83
    │   │   ├── BeanFormPage.jsx             ✅ /new, /bean/:id/edit
    │   │   ├── DialIn.jsx                   ✅ CB-88–CB-94
    │   │   └── ContainerQRPage.jsx          ✅ CB-72, CB-73, CB-105 – CB-108
    │   └── components/
    │       ├── ui/                          ✅ Dial, RingBadge, BottomNav, Sheet, controls, icons
    │       ├── beans/
    │       │   ├── BeanList.jsx             ✅ CB-01–CB-24, CB-74–CB-82, CB-84
    │       │   ├── BeanFilter.jsx           ✅ CB-09–CB-24
    │       │   ├── BeanForm.jsx             ✅ CB-25–CB-41, CB-53–CB-66, CB-85–CB-87, CB-95–CB-104
    │       │   ├── BeanImportSheet.jsx      ✅ CB-95–CB-104 (import sheet)
    │       │   └── useSwipeReveal.js        ✅ CB-84
    │       ├── containers/
    │       │   └── ContainerList.jsx        ✅ CON-01–CON-28
    │       ├── shops/
    │       │   └── ShopList.jsx             ✅ SH-01–SH-14
    │       └── common/
    │           ├── EmptyState.jsx           ✅
    │           └── Dialog.jsx               ✅
    ├── .env                                 ← not in Git (dev Logto config)
    ├── .env.production                      ← committed (no secrets, Vite bakes at build)
    ├── index.html
    ├── vite.config.js                       ✅ base: "/beans/" (must match Express + Logto URIs)
    └── package.json
```
