# Beans Tracker · Project Roadmap

Single source of truth for the build plan. Reference this at the start of every new conversation.

---

## Architecture

```
Phone / browser
      │  HTTPS (custom domain)
      ▼
GitHub Pages — React + Vite (static, free hosting)
      │  API calls over HTTPS
      ▼
DSM Reverse Proxy — handles SSL termination
      │  HTTP (port 8080, internal)
      ▼
Nginx container — Docker on DS220+
      │
      ▼
Node + Express API — Docker container on DS220+
      │
      ▼
SQLite file — Docker volume on DS220+ disk
```

**Key facts:**

- Frontend lives on GitHub Pages, backend lives on the NAS
- QR codes are plain URLs: `https://ra-homelab.synology.me/container/1`
- The `.db` file never goes into Git — NAS only
- One Docker Compose file manages Nginx + API + volume together
- DSM reverse proxy handles HTTPS and SSL certificates (Let's Encrypt via DSM)
- Nginx runs on port 8080 internally (port 80 reserved by DSM)
- `BrowserRouter` uses `basename="/bean-tracker"` for correct GitHub Pages routing
- `VITE_API_URL` is set to `https://ra-homelab.synology.me` (no `/api` suffix — api.js appends paths)

---

## Stack

| Layer         | Choice                  | Notes                                              |
| ------------- | ----------------------- | -------------------------------------------------- |
| Frontend      | React + Vite            | No CSS framework — plain CSS with variables        |
| Routing       | React Router            | Handles QR code URLs (`/container/:id`)            |
| Backend       | Node + Express          | REST API, one file per resource                    |
| Database      | SQLite (better-sqlite3) | Single `.db` file, WAL mode                        |
| Hosting       | GitHub Pages            | Free, auto-deploy via GitHub Actions               |
| Reverse proxy | Nginx (Docker)          | Proxies /api/\* to Express on port 8080            |
| SSL           | DSM built-in            | Let's Encrypt via DSM Control Panel → Certificate  |
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
- `ALLOWED_ORIGIN` set to `https://radev81.github.io` in docker-compose.yml

**NAS deployment notes:**

- Project lives at `/volume1/apps/bean-tracker` (not `/volume1/apps/` — required `sudo mv` + `sudo chown`)
- Port 80 conflict with DSM resolved by switching Nginx to port 8080
- `nano` not available on Synology — use `vi` instead
- `docker` commands require `sudo` on Synology SSH

### ✅ Phase 6 — Domain, DDNS & HTTPS (COMPLETE)

- DDNS configured in DSM → Control Panel → External Access → `ra-homelab.synology.me`
- Router port forwarding: 443 → NAS:443, 80 → NAS:80 (port 80 needed for Let's Encrypt challenge)
- SSL certificate obtained via DSM → Control Panel → Security → Certificate (Let's Encrypt)
- DSM Reverse Proxy configured: HTTPS:443 → localhost:8080
- Live and verified: `https://ra-homelab.synology.me/api/health` returns `{"status":"ok"}`

### ✅ Phase 7 — GitHub Pages deploy (COMPLETE)

- `frontend/vite.config.js` — `base: '/bean-tracker/'`
- `frontend/src/main.jsx` — `BrowserRouter basename="/bean-tracker"`
- `frontend/public/404.html` — sessionStorage redirect trick for React Router on GitHub Pages
- `frontend/index.html` — redirect restore script in `<head>`
- `.github/workflows/deploy.yml` — auto-build and publish on push to main
- `VITE_API_URL=https://ra-homelab.synology.me` injected at build time via workflow env
- Live at: `https://radev81.github.io/bean-tracker/`

**GitHub Pages deployment notes:**

- `VITE_API_URL` must NOT include `/api` — api.js appends route paths itself
- `BrowserRouter basename` is required — without it React Router strips the `/bean-tracker/` prefix and routes break
- GitHub Actions workflow injects `VITE_API_URL` at build time (environment variable in deploy.yml)

### ✅ Phase 4 — QR codes

- QR code URLs follow the pattern: `https://ra-homelab.synology.me/container/:id`
- No code changes needed — handled by `ContainerQRPage.jsx`
- Generate QR codes and print/attach to physical containers as needed

---

## Starting a new conversation

Paste this block at the top of every new conversation:

```
I'm building a coffee beans tracker app called Beans Tracker.

Stack: React + Vite frontend on GitHub Pages, Node + Express + SQLite
backend running in Docker on a Synology DS220+ NAS.

Repo: github.com/radev81/bean-tracker
Structure:
  bean-tracker/
  ├── frontend/   (Vite + React, React Router)
  └── backend/    (Node + Express + SQLite, port 3001)

Design: Outfit font, Mocha Deep gradient accent (#6A3828 → #0E0806),
warm paper background #F4F2EE, white surfaces, 14px card radius.
Full token set and design reference: frontend/public/design-reference.html
Full BDD scenario catalogue: frontend/public/scenario-catalogue.html
Full build plan: ROADMAP.md (project root)

Live URLs:
  Frontend: https://radev81.github.io/bean-tracker/
  Backend:  https://ra-homelab.synology.me/api

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

# Test API (use REST Client extension in VS Code)
# open backend/test.http

# Commit and push
git add .
git commit -m "feat: description"
git push

# On NAS — pull latest code and restart containers
cd /volume1/apps/bean-tracker
git pull
docker compose up -d --build

# On NAS — view live logs
docker logs bean-api -f
docker logs bean-nginx -f

# On NAS — restart containers only (no rebuild)
docker compose restart

# On NAS — check container status
docker ps
```

---

## File locations quick reference

```
bean-tracker/
├── .gitignore
├── ROADMAP.md                               ← this file
├── docker-compose.yml                       ✅ Phase 5
├── nginx/
│   └── nginx.conf                           ✅ Phase 5
├── .github/
│   └── workflows/
│       └── deploy.yml                       ✅ Phase 7
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql                   ✅
│   │   │   └── database.js                  ✅
│   │   ├── routes/
│   │   │   ├── beans.js                     ✅ full CRUD
│   │   │   ├── containers.js                ✅ full CRUD + QR endpoint
│   │   │   └── shops.js                     ✅ full CRUD
│   │   └── index.js                         ✅
│   ├── data/                                ← bean.db lives here (not in Git)
│   ├── .env                                 ← not in Git
│   ├── test.http
│   └── package.json
└── frontend/
    ├── public/
    │   ├── design-reference.html            ← locked design
    │   ├── scenario-catalogue.html          ← BDD spec
    │   └── 404.html                         ✅ Phase 7 — React Router redirect
    ├── src/
    │   ├── theme.js                         ✅
    │   ├── index.css                        ✅
    │   ├── api.js                           ✅
    │   ├── main.jsx                         ✅ basename="/bean-tracker"
    │   ├── App.jsx                          ✅ layout route pattern
    │   ├── App.css                          ✅
    │   ├── pages/
    │   │   └── ContainerQRPage.jsx          ✅ CB-72, CB-73
    │   │   └── ContainerQRPage.css          ✅
    │   └── components/
    │       ├── beans/
    │       │   ├── BeanList.jsx             ✅ CB-01, CB-02
    │       │   ├── BeanList.css             ✅
    │       │   ├── BeanCard.jsx             ✅ CB-42–CB-52
    │       │   ├── BeanCard.css             ✅
    │       │   ├── BeanSearch.jsx           ✅ CB-03–CB-08
    │       │   ├── BeanSearch.css           ✅
    │       │   ├── BeanFilter.jsx           ✅ CB-09–CB-24
    │       │   ├── BeanFilter.css           ✅
    │       │   ├── BeanForm.jsx             ✅ CB-25–CB-66
    │       │   └── BeanForm.css             ✅
    │       ├── containers/
    │       │   ├── ContainerList.jsx        ✅ CON-01–CON-21
    │       │   └── ContainerList.css        ✅
    │       ├── shops/
    │       │   ├── ShopList.jsx             ✅ SH-01–SH-08 + edit/remove
    │       │   └── ShopList.css             ✅
    │       └── common/
    │           ├── EmptyState.jsx           ✅
    │           ├── EmptyState.css           ✅
    │           ├── Dialog.jsx               ✅
    │           └── Dialog.css               ✅
    ├── .env                                 ← not in Git
    ├── .env.production                      ← VITE_API_URL (also set in deploy.yml)
    ├── index.html                           ✅ redirect restore script in <head>
    ├── vite.config.js                       ✅ base: '/bean-tracker/'
    └── package.json
```
