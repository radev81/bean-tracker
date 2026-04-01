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
- QR codes are plain URLs: `https://ra-homelab.synology.me:3200/container/1`
- The `.db` file never goes into Git — bind-mounted from `/volume1/docker/bean-tracker/data/`
- Caddy handles HTTPS using the shared Synology certificate
- No Nginx container, no Authelia container, no GitHub Pages deployment

---

## Stack

| Layer         | Choice                  | Notes                                              |
| ------------- | ----------------------- | -------------------------------------------------- |
| Frontend      | React + Vite            | No CSS framework — plain CSS with variables        |
| Routing       | React Router            | Handles QR code URLs (`/container/:id`)            |
| Backend       | Node + Express (ESM)    | REST API + serves built frontend as static files   |
| Database      | SQLite (better-sqlite3) | Single `.db` file, WAL mode                        |
| Auth          | Logto                   | Shared NAS instance, OIDC/JWT Bearer tokens        |
| Reverse proxy | Caddy                   | Shared NAS instance, Synology certificate          |
| DDNS          | Synology built-in       | ra-homelab.synology.me → home IP                   |
| NAS           | Synology DS220+         | Docker + Container Manager already installed       |
| IDE           | VS Code (Windows 11)    | Extensions: ESLint, Prettier, GitLens, REST Client |

---

## Design

**Theme:** Mocha Deep — locked March 2026
**Reference file:** `frontend/public/design-reference.html`

### Tokens

```css
/* Accent — Mocha Deep gradient */
--accent-a: #6a3828; /* gradient start — dark roast brown */
--accent-b: #0e0806; /* gradient end   — near-black */
--accent-mid: #4a2818; /* borders, badges */
--accent-bg: rgba(74, 40, 24, 0.08);
--accent-border: rgba(74, 40, 24, 0.2);
--accent-text: #3a1810;

/* Gradients */
--grad-h: linear-gradient(135deg, #6a3828, #0e0806); /* buttons, tags */
--grad-v: linear-gradient(180deg, #6a3828, #0e0806); /* card left bar */
--grad-tab: linear-gradient(90deg, #6a3828, #0e0806); /* tab underline */

/* Backgrounds */
--bg: #f4f2ee; /* warm paper */
--surface: #ffffff; /* cards, header */

/* Borders */
--border: #e4e1da;
--border-hi: #cccab8;

/* Text */
--text: #0a0906; /* primary */
--text2: #6b6860; /* secondary */
--text3: #ababab; /* tertiary / labels */
--text4: #d4d2cc; /* ghost / inactive */

/* Radii */
--r-card: 14px;
--r-btn: 9px;
--r-tag: 5px;
--r-input: 11px;
--r-add: 14px;
```

### Typography

- **Font:** Outfit only (Google Fonts)
- **700** — brand name, recipe values
- **600** — bean names, add button
- **500** — active tab, count pills
- **400** — body, metadata, values
- **300 italic** — tasting notes

### Key UI rules

- Mocha Deep gradient appears on: tab underline, card left bar (expanded), flavour tags, container badges, Edit button, Add button
- Expanded card: 1.5px `--accent-mid` border + 3px left bar gradient
- Add button always fixed at bottom with border-top separator
- Favourite icon uses gradient text clip when active
- Pipes `|` between tab labels

---

## BDD Scenario Catalogue

Full specification lives in `frontend/public/scenario-catalogue.html`.

**73 scenarios across 3 sections:**

- **Coffee Beans (CB-01 to CB-73):** List display, search, filtering, add, expand/collapse, favourites, edit, delete, QR code
- **Containers (CON-01 to CON-21):** List display, add, edit, remove
- **Shops (SH-01 to SH-08):** List display, add, edit, remove (edit/remove added beyond spec)

Build order follows the catalogue section by section.

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

All icons should use the Mocha Deep gradient (`#6a3828 → #0e0806`) as background with a white coffee bean or cup mark centred in the safe zone.

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

### ✅ Design — Mocha Deep locked

- 4 design concept rounds explored
- Final design: light minimal catalog aesthetic, Outfit font, Mocha Deep gradient accent
- Design reference committed: `frontend/public/design-reference.html`
- Scenario catalogue committed: `frontend/public/scenario-catalogue.html`

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

**App routing notes:**

- `/container/:id` is a standalone route — bypasses AppShell (no header/tabs)
- All other routes rendered inside AppShell via React Router layout route pattern
- Components folder is `frontend/src/components/common/` (not shared/)
- `BrowserRouter` uses `basename="/bean-tracker"` — required for correct GitHub Pages routing

**API notes:**

- `apiFetch` always throws on non-ok responses, with `error.status` set
- 409 responses are caught in component `catch` blocks to show duplicate dialogs
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

- QR code URLs follow the pattern: `https://ra-homelab.synology.me/container/:id`
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

Design: Outfit font, Mocha Deep gradient accent (#6A3828 → #0E0806),
warm paper background #F4F2EE, white surfaces, 14px card radius.
Full token set and design reference: frontend/public/design-reference.html
Full BDD scenario catalogue: frontend/public/scenario-catalogue.html
Full build plan: ROADMAP.MD (project root)

Live URL: https://ra-homelab.synology.me:3200

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

# On NAS — pull latest code and rebuild
cd /volume1/docker/bean-tracker
git pull
docker compose up -d --build

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
│   │   │   └── shops.js                     ✅ full CRUD, ESM
│   │   └── index.js                         ✅ Logto auth, static serving, ESM
│   ├── data/                                ← bean.db lives here locally (not in Git)
│   ├── .env                                 ← not in Git
│   ├── test.http
│   └── package.json
└── frontend/
    ├── public/
    │   ├── design-reference.html            ← locked design
    │   └── scenario-catalogue.html          ← BDD spec
    ├── src/
    │   ├── theme.js                         ✅
    │   ├── index.css                        ✅
    │   ├── api.js                           ✅ createApiClient + ApiContext + useApi
    │   ├── main.jsx                         ✅ LogtoProvider + callback handler
    │   ├── App.jsx                          ✅ auth gate + ApiContext.Provider
    │   ├── App.css                          ✅
    │   ├── pages/
    │   │   └── ContainerQRPage.jsx          ✅ CB-72, CB-73
    │   └── components/
    │       ├── beans/
    │       │   ├── BeanList.jsx             ✅ CB-01, CB-02
    │       │   ├── BeanCard.jsx             ✅ CB-42–CB-52
    │       │   ├── BeanSearch.jsx           ✅ CB-03–CB-08
    │       │   ├── BeanFilter.jsx           ✅ CB-09–CB-24
    │       │   └── BeanForm.jsx             ✅ CB-25–CB-66
    │       ├── containers/
    │       │   └── ContainerList.jsx        ✅ CON-01–CON-21
    │       ├── shops/
    │       │   └── ShopList.jsx             ✅ SH-01–SH-08 + edit/remove
    │       └── common/
    │           ├── EmptyState.jsx           ✅
    │           └── Dialog.jsx               ✅
    ├── .env                                 ← not in Git (dev Logto config)
    ├── .env.production                      ← committed (no secrets, Vite bakes at build)
    ├── index.html
    ├── vite.config.js                       ✅ no base path (serves from root)
    └── package.json
```
