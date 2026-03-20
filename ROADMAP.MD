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
Nginx reverse proxy — Docker container on DS220+
      │
      ▼
Node + Express API — Docker container on DS220+
      │
      ▼
SQLite file — Docker volume on DS220+ disk
```

**Key facts:**

- Frontend lives on GitHub Pages, backend lives on the NAS
- QR codes are plain URLs: `https://yourdomain.com/container/1`
- The `.db` file never goes into Git — NAS only
- One Docker Compose file manages Nginx + API + volume together

---

## Stack

| Layer         | Choice                  | Notes                                              |
| ------------- | ----------------------- | -------------------------------------------------- |
| Frontend      | React + Vite            | No CSS framework — plain CSS with variables        |
| Routing       | React Router            | Handles QR code URLs (`/container/:id`)            |
| Backend       | Node + Express          | REST API, one file per resource                    |
| Database      | SQLite (better-sqlite3) | Single `.db` file, WAL mode                        |
| Hosting       | GitHub Pages            | Free, auto-deploy via GitHub Actions               |
| Reverse proxy | Nginx (Docker)          | Handles HTTPS, proxies to Express                  |
| SSL           | Let's Encrypt / Certbot | Free certificates, auto-renew                      |
| DDNS          | Synology built-in       | Keeps domain pointing to home IP                   |
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
- **Shops (SH-01 to SH-08):** List display, add

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
- `backend/src/routes/beans.js` — GET `/api/beans`, GET `/api/beans/:id`
- `backend/src/routes/containers.js` — GET `/api/containers`, GET `/api/containers/:id/current-bean`
- `backend/src/routes/shops.js` — GET `/api/shops`
- `backend/src/index.js` — Express server, CORS, health check at `/api/health`
- `backend/.env` — `PORT=3001`, `ALLOWED_ORIGIN=http://localhost:5173`
- All routes tested with REST Client, returning correct empty arrays
- Committed: `feat: backend API skeleton with beans, containers and shops routes`

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

### 🔲 Phase 3 — React frontend (IN PROGRESS)

Build order — one component group at a time, each tied to scenario IDs:

**Done:**

1. ✅ `frontend/src/theme.js` — CSS variable token file
2. ✅ App shell — `App.jsx`, `App.css`, routing, global layout, tab bar
3. ✅ `frontend/src/index.css` — global reset + CSS custom properties
4. ✅ `frontend/src/api.js` — centralised fetch wrapper (VITE_API_URL from .env)
5. ✅ `frontend/src/main.jsx` — entry point, BrowserRouter wrapper
6. ✅ `EmptyState.jsx` — reusable empty state component
7. ✅ `BeanList.jsx` — CB-01, CB-02 (empty state + list)
8. ✅ `BeanCard.jsx` — CB-42–CB-46 (expand/collapse), CB-47–CB-52 (favourite toggle)
9. ✅ `BeanSearch.jsx` — CB-03–CB-08 (search + clear)
10. ✅ `BeanFilter.jsx` — CB-09–CB-24 (filter panel)
11. ✅ `GET /api/beans/:id` — returns bean + tags + recipes
12. ✅ `PUT /api/beans/:id/favourite` — toggles is_favourite
    **Next:**
13. 🔲 BeanForm — CB-25 to CB-41 (Add new card)
14. 🔲 Edit flow — CB-53 to CB-66
15. 🔲 Delete flow — CB-67 to CB-71
16. 🔲 `ContainerQRPage.jsx` — CB-72, CB-73 (QR scan route)
17. 🔲 Containers tab — CON-01 to CON-21
18. 🔲 Shops tab — SH-01 to SH-08

### 🔲 Phase 4 — QR codes

- Generate QR codes for `https://yourdomain.com/container/1` and `/container/2`
- Print and attach to physical containers
- No code needed — handled by `ContainerQRPage.jsx` route above

### 🔲 Phase 5 — Docker on the NAS

- `backend/Dockerfile`
- `docker-compose.yml` (api + nginx services, bean-data volume)
- `nginx/nginx.conf` (reverse proxy + HTTPS)
- SSH into DS220+, clone repo, `docker compose up -d`

### 🔲 Phase 6 — Domain, DDNS & HTTPS

- Configure DDNS in DSM → Control Panel → External Access
- Port forward 443 + 80 on home router to DS220+ local IP
- Run Certbot inside Nginx container for Let's Encrypt SSL certificate

### 🔲 Phase 7 — GitHub Pages deploy

- `frontend/vite.config.js` — set `base: '/bean-tracker/'`
- `frontend/.env.production` — `VITE_API_URL=https://yourdomain.com/api`
- `.github/workflows/deploy.yml` — auto-build and publish on push to main

---

## Starting a new conversation

Paste this block at the top of every new conversation:

```
I'm building a coffee beans tracker app called Beans Tracker.

Stack: React + Vite frontend on GitHub Pages, Node + Express + SQLite
backend running in Docker on a Synology DS220+ NAS.

Repo: github.com/YOUR_USERNAME/bean-tracker
Structure:
  bean-tracker/
  ├── frontend/   (Vite + React, React Router)
  └── backend/    (Node + Express + SQLite, port 3001)

Design: Outfit font, Mocha Deep gradient accent (#6A3828 → #0E0806),
warm paper background #F4F2EE, white surfaces, 14px card radius.
Full token set and design reference: frontend/public/design-reference.html
Full BDD scenario catalogue: frontend/public/scenario-catalogue.html
Full build plan: ROADMAP.md (project root)

Current status: [paste relevant phase from ROADMAP.md]

Next task: [describe what to build next]
```

---

## Useful commands

```bash
# Run backend locally
cd backend && node src/index.js

# Run frontend locally
cd frontend && npm run dev

# Test API (use REST Client extension in VS Code)
# open backend/test.http

# Commit and push
git add .
git commit -m "feat: description"
git push

# On NAS — restart containers after update
docker compose pull && docker compose up -d
```

---

## File locations quick reference

```
bean-tracker/
├── .gitignore
├── ROADMAP.md                          ← this file
├── docker-compose.yml                  ← Phase 5
├── nginx/
│   └── nginx.conf                      ← Phase 5
├── .github/
│   └── workflows/
│       └── deploy.yml                  ← Phase 7
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── database.js
│   │   ├── routes/
│   │   │   ├── beans.js
│   │   │   ├── containers.js
│   │   │   └── shops.js
│   │   └── index.js
│   ├── data/                           ← bean.db lives here (not in Git)
│   ├── .env                            ← not in Git
│   ├── test.http
│   └── package.json
└── frontend/
    ├── public/
    │   ├── design-reference.html       ← locked design
    │   └── scenario-catalogue.html     ← BDD spec
    ├── src/
    │   ├── theme.js                    ← CSS variable tokens  ✅
    │   ├── index.css                   ← global reset + CSS vars  ✅
    │   ├── api.js                      ← centralised fetch wrapper  ✅
    │   ├── main.jsx                    ← entry point  ✅
    │   ├── App.jsx                     ← shell, tabs, routing  ✅
    │   ├── App.css                     ← shell layout  ✅
    │   └── components/
    │       ├── beans/
    │       │   ├── BeanList.jsx        ← CB-01, CB-02  ✅
    │       │   ├── BeanList.css        ✅
    │       │   ├── BeanCard.jsx        ← collapsed row  ✅
    │       │   ├── BeanCard.css        ✅
    │       │   ├── BeanSearch.jsx      ← CB-03 to CB-08  🔲
    │       │   └── BeanFilter.jsx      ← CB-09 to CB-24  🔲
    │       ├── shared/
    │       │   ├── EmptyState.jsx      ✅
    │       │   ├── EmptyState.css      ✅
    │       │   └── ConfirmDialog.jsx   ← Phase 3 later  🔲
    │       ├── containers/             ← Phase 3 later  🔲
    │       └── shops/                  ← Phase 3 later  🔲
    ├── pages/
    │   ├── ContainerQRPage.jsx         ← CB-72, CB-73  🔲
    │   └── (others inline in App.jsx for now)
    ├── .env                            ← not in Git  ✅
    ├── .env.production                 ← not in Git  🔲 Phase 7
    ├── vite.config.js
    └── package.json
```
