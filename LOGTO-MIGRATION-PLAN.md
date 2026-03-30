# Logto Migration Plan — bean-tracker

## 1. Overview

### What is changing

The current architecture has three Docker containers (`bean-api`, `bean-nginx`, `bean-authelia`) plus a GitHub Pages-hosted React frontend. Auth is handled by Authelia via Nginx `auth_request` sub-requests and session cookies. The frontend is deployed by a GitHub Actions workflow on every push to main.

The target architecture collapses everything into a single Docker container. The backend Express server serves both the API and the built React frontend as static files. Auth is handled by Logto (already running on the NAS) using OIDC: the frontend uses `@logto/react` for sign-in/sign-out, and the backend validates JWT Bearer tokens using the `jose` library against Logto's JWKS endpoint.

Caddy (already running) handles external HTTPS at port 3200 and proxies to internal NAS port 3201.

### Why

- Single container is simpler to deploy, update, and debug
- Logto is already running and used by the days-off project — reusing shared infra
- Eliminates Nginx config complexity and Authelia maintenance
- Eliminates GitHub Actions deployment and GitHub Pages hosting
- Frontend and API on the same origin removes all CORS concerns in production

---

## 2. Port Allocation

Following the NAS-INFRA-TEMPLATE.md convention (next free slot after Days Off at 3100/3101):

| Role | Port |
|------|------|
| External HTTPS (via Caddy, browser-facing) | **3200** |
| Internal HTTP (NAS host port, maps to container port 3000) | **3201** |
| Container internal listen port | **3000** |

The docker-compose.yml maps `3201:3000`. Caddy proxies `ra-homelab.synology.me:3200` → `192.168.x.x:3201`.

---

## 3. Files to Delete

| File | Reason |
|------|--------|
| `nginx/nginx.conf` | Nginx container is removed |
| `authelia/configuration.yml` | Authelia container is removed |
| `authelia/users_database.yml` | Authelia container is removed (already gitignored, but delete from disk) |
| `backend/Dockerfile` | Replaced by a new multi-stage Dockerfile at the repo root |
| `.github/workflows/deploy.yml` | GitHub Pages deployment is no longer used |

The `nginx/` and `authelia/` directories can be fully removed.

---

## 4. Files to Create

| File | Contents |
|------|----------|
| `Dockerfile` (repo root) | Multi-stage build: stage 1 builds the React frontend using Node 20 Alpine; stage 2 runs the Express backend, copies frontend `dist` into `./public`, exposes port 3000 |
| `.dockerignore` (repo root) | Excludes `backend/node_modules`, `frontend/node_modules`, `frontend/dist`, `.env` |

---

## 5. Files to Modify

### 5.1 `docker-compose.yml`

Replace entirely. The new file has a single service `bean-tracker`:
- `build: .` (context is repo root, uses the new root Dockerfile)
- `container_name: bean-tracker`
- `restart: unless-stopped`
- `ports: ["3201:3000"]`
- `environment` block reading from `.env` via `${VAR}` substitution: `NODE_ENV`, `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `SESSION_SECRET`, `BASE_URL`, `API_RESOURCE`, `DATABASE_PATH=/data/bean.db`
- `volumes: [./data:/data]` (bind mount replaces old named volume `bean-data`)
- Remove the `networks:` section (not needed with a single container)

### 5.2 `backend/package.json`

Add new dependencies:
- `@logto/express` — provides `handleAuthRoutes` for the OIDC callback flow
- `jose` — JWT verification against Logto's JWKS
- `express-session` — session middleware required by `@logto/express`
- `cookie-parser` — required by `@logto/express`

> **Note:** Verify that `@logto/express` supports CommonJS `require()`. If it ships ESM-only, switch the backend `"type"` to `"module"` and convert all `require`/`module.exports` to `import`/`export` throughout backend source files.

### 5.3 `backend/src/index.js`

This is the most significant backend change. Modifications in order:

1. **Add imports** for `path`, `url` (for `__dirname` in ESM), `@logto/express` (`handleAuthRoutes`), `jose` (`createRemoteJWKSet`, `jwtVerify`), `express-session`, and `cookie-parser`.

2. **Remove** the `ALLOWED_ORIGIN`/`allowedOrigins` CORS logic. Replace with CORS that only allows `http://localhost:5173` in development (guard with `if (process.env.NODE_ENV !== 'production')`). In production, same-origin means no CORS is needed.

3. **Add Logto config object** reading from env vars `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `BASE_URL`. Scopes: `["openid", "profile", "email"]`.

4. **Add JWKS constant**: `const JWKS = createRemoteJWKSet(new URL(\`\${process.env.LOGTO_ENDPOINT}/oidc/jwks\`))`.

5. **Register middleware** (before any routes) in this order:
   - `app.use(cookieParser())`
   - `app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 } }))`
   - `app.use(handleAuthRoutes(logtoConfig))` — registers `/sign-in`, `/sign-in-callback`, `/sign-out`

6. **Add `requireAuth` async middleware function**: reads `Authorization: Bearer <token>` header, returns 401 JSON if missing, calls `jwtVerify(token, JWKS, { issuer: \`\${LOGTO_ENDPOINT}/oidc\`, audience: API_RESOURCE })` wrapped in try/catch (return 401 on error).

   > **Note:** This is a single-user personal app — no `req.userId` filtering in queries is needed. `requireAuth` just gates access.

7. **Apply `requireAuth`** to all three API route registrations: `/api/beans`, `/api/containers`, `/api/shops`. The `/api/health` route can remain unprotected.

8. **Add static file serving** after all API routes:
   - `app.use(express.static(path.join(__dirname, "../public")))`
   - `app.get("/{*splat}", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")))` — `/{*splat}` is required for Express 5

9. **Change `PORT` default** from `3001` to `3000`.

### 5.4 `frontend/src/api.js`

Replace the current `apiFetch` wrapper. Changes:

1. **Remove** `const BASE = import.meta.env.VITE_API_URL` and `credentials: "include"`.

2. **Remove** the 401 redirect to Authelia.

3. **Export a factory function `createApiClient(getAccessToken)`** that returns a `request(method, path, body)` async function inside. Inside `request`:
   - Call `const token = await getAccessToken(import.meta.env.VITE_API_RESOURCE)` for a fresh Bearer token
   - Fetch: `\`\${import.meta.env.VITE_API_BASE ?? ""}\${path}\`` with `Authorization: Bearer \${token}` header
   - On non-ok response, throw an error with the API error message

4. **Expose all existing API functions** (`getBeans`, `getBeanById`, `createBean`, `updateBean`, `toggleFavourite`, `deleteBean`, `getContainers`, `createContainer`, `updateContainer`, `deleteContainer`, `getShops`, `createShop`, `updateShop`, `deleteShop`) as methods on the object returned by `createApiClient`.

5. **Update all callers** (in `App.jsx`, `ContainerQRPage.jsx`, and any other components) to obtain the api client via `createApiClient(getAccessToken)` where `getAccessToken` comes from `useLogto()`. Thread the client via props or a React context as needed.

### 5.5 `frontend/src/main.jsx`

Three changes:

1. **Remove `basename="/bean-tracker"`** from `<BrowserRouter>` — the app now runs at the root path.

2. **Import** `LogtoProvider` and `useHandleSignInCallback` from `@logto/react`.

3. **Restructure the render tree**:
   - Build a `logtoConfig` from `VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, and `VITE_API_RESOURCE` (as the `resources` array).
   - Create a `Root` component that calls `useHandleSignInCallback(() => { window.location.replace("/"); })`. If `window.location.pathname === "/callback"`, render a loading indicator while `isLoading` is true, then null. Otherwise render `<App />`.
   - Final render: `<LogtoProvider config={logtoConfig}><BrowserRouter><Root /></BrowserRouter></LogtoProvider>`.

### 5.6 `frontend/src/App.jsx`

Add auth-aware behaviour:

1. **Import `useLogto`** from `@logto/react`.

2. **In `App`**, call `const { isAuthenticated, isLoading, signIn, signOut, getAccessToken } = useLogto()`.

3. **Add an auth gate**: if `isLoading`, render a loading state. If `!isAuthenticated`, render a simple splash screen with a "Sign in" button that calls `signIn(\`\${window.location.origin}/callback\`)`.

4. **Create the api client** with `useMemo(() => createApiClient(getAccessToken), [getAccessToken])` and pass it to child components that make API calls.

5. **Update `useEffect` data-loading calls** to use the api client.

6. **Add a sign-out button** in the app header calling `signOut(window.location.origin)`.

### 5.7 `frontend/.env.production`

Replace entirely (no secrets — Vite bakes these into the JS bundle):
```
VITE_LOGTO_ENDPOINT=https://ra-homelab.synology.me:3301
VITE_LOGTO_APP_ID=<frontend-spa-app-id-from-logto>
VITE_API_BASE=
VITE_API_RESOURCE=http://localhost:3000
```
`VITE_API_BASE` is intentionally empty — API calls go to the same origin in production.

Ensure `.gitignore` has `!frontend/.env.production` so this file is committed.

### 5.8 `frontend/vite.config.js`

Remove `base: "/bean-tracker/"`. The resulting file needs only the React plugin (and any other existing plugins).

### 5.9 `frontend/package.json`

Add new dependency: `@logto/react`.

### 5.10 `frontend/.env` (development)

Replace with:
```
VITE_LOGTO_ENDPOINT=https://ra-homelab.synology.me:3301
VITE_LOGTO_APP_ID=<frontend-spa-app-id>
VITE_API_BASE=http://localhost:3000
VITE_API_RESOURCE=http://localhost:3000
```

### 5.11 `.gitignore` (repo root)

- Add `/data/` to ignore the local SQLite data bind-mount directory
- Add `!frontend/.env.production` if not already present
- The `authelia/` and `nginx/` entries can stay or be removed — they are harmless after the dirs are deleted

---

## 6. NAS Setup Steps

### Step 1 — Confirm ports are free

```bash
docker ps
```
Verify nothing is using ports 3200 or 3201.

### Step 2 — Register in Logto admin console

Open `https://ra-homelab.synology.me:3302`.

**Backend app (Traditional Web):**
1. Applications → Create application → Traditional Web
2. Name: "Bean Tracker Backend"
3. Note the **App ID** and **App Secret**
4. No redirect URIs needed

**Frontend app (Single Page App):**
1. Applications → Create application → Single Page App
2. Name: "Bean Tracker Frontend"
3. Note the **App ID**
4. Redirect URI: `https://ra-homelab.synology.me:3200/callback`
5. Post sign-out redirect URI: `https://ra-homelab.synology.me:3200`

Also add these for local dev (can remove later):
- Redirect URI: `http://localhost:5173/callback`
- Post sign-out redirect URI: `http://localhost:5173`

**API Resource:**
1. API Resources → Create API resource
2. Name: "Bean Tracker API"
3. Identifier: `http://localhost:3000`
4. Note this identifier — it is `API_RESOURCE` in the backend `.env` and `VITE_API_RESOURCE` in the frontend env

Update `frontend/.env.production` with the real frontend App ID, then commit it before building.

### Step 3 — Add Caddy entry

```bash
ssh your-username@ra-homelab.synology.me
vi /volume1/docker/logto/Caddyfile
```

Add at the end:
```
ra-homelab.synology.me:3200 {
  tls /certs/fullchain.pem /certs/privkey.pem
  reverse_proxy 192.168.x.x:3201
}
```

Replace `192.168.x.x` with the NAS LAN IP (`ip addr show | grep "inet 192"`).

### Step 4 — Add router port forwarding

In your router admin panel, add: external port 3200 → NAS LAN IP → internal port 3200. Protocol TCP.

### Step 5 — Add port 3200 to Caddy's docker-compose.yml ports

```bash
vi /volume1/docker/logto/docker-compose.yml
```

Add `"3200:3200"` to the `caddy` service `ports` list. Then recreate Caddy:

```bash
cd /volume1/docker/logto
docker compose down
docker compose up -d
```

### Step 6 — Create app folder and clone repo

```bash
mkdir -p /volume1/docker/bean-tracker/data
cd /volume1/docker/bean-tracker
git clone https://github.com/radev81/bean-tracker.git .
```

### Step 7 — Create `.env` file on the NAS

```bash
vi /volume1/docker/bean-tracker/.env
```

```env
LOGTO_ENDPOINT=https://ra-homelab.synology.me:3301
LOGTO_APP_ID=<backend-traditional-web-app-id>
LOGTO_APP_SECRET=<backend-app-secret>
SESSION_SECRET=<generate-with: cat /proc/sys/kernel/random/uuid>
BASE_URL=https://ra-homelab.synology.me:3200
API_RESOURCE=http://localhost:3000
DATABASE_PATH=/data/bean.db
```

This file is NOT committed to git.

### Step 8 — Migrate existing SQLite data

If there is an existing `bean.db` in the named Docker volume `bean-data`, copy it to the new bind mount:

```bash
docker run --rm \
  -v bean-data:/source \
  -v /volume1/docker/bean-tracker/data:/dest \
  alpine cp /source/bean.db /dest/bean.db
```

Verify: `ls -la /volume1/docker/bean-tracker/data/`

### Step 9 — Stop old containers

```bash
docker stop bean-api bean-nginx bean-authelia
docker rm bean-api bean-nginx bean-authelia
```

### Step 10 — Build and start

```bash
cd /volume1/docker/bean-tracker
docker compose up -d --build
docker ps
docker logs bean-tracker
```

Test:
```bash
curl https://ra-homelab.synology.me:3200/api/health
```

Then open `https://ra-homelab.synology.me:3200` in the browser — you should be redirected to the Logto sign-in page.

### Step 11 — Update NAS-INFRA-TEMPLATE.md inventory

Add to the app inventory table:

| Bean Tracker | `https://ra-homelab.synology.me:3200` | 3201 | `/volume1/docker/bean-tracker/` |

---

## 7. Dev Environment

### Backend

Create `backend/.env` (not committed):
```env
PORT=3000
NODE_ENV=development
LOGTO_ENDPOINT=https://ra-homelab.synology.me:3301
LOGTO_APP_ID=<backend-traditional-web-app-id>
LOGTO_APP_SECRET=<backend-app-secret>
SESSION_SECRET=any-local-dev-secret
BASE_URL=http://localhost:3000
API_RESOURCE=http://localhost:3000
DATABASE_PATH=./data/bean.db
```

```bash
cd backend && npm run dev
```

### Frontend

The `frontend/.env` (or `.env.development`) should have:
```env
VITE_LOGTO_ENDPOINT=https://ra-homelab.synology.me:3301
VITE_LOGTO_APP_ID=<frontend-spa-app-id>
VITE_API_BASE=http://localhost:3000
VITE_API_RESOURCE=http://localhost:3000
```

```bash
cd frontend && npm run dev
```

`VITE_API_BASE` is an absolute URL so no Vite proxy config is needed. The backend's dev-only CORS config allows `localhost:5173`.

Sign-in flow in dev: browser → Logto hosted UI → redirects to `http://localhost:5173/callback` → `useHandleSignInCallback` exchanges the code → redirects to `/`.

---

## 8. Implementation Order

1. Backend: `package.json` (add deps) → `src/index.js` (auth + static serving + port)
2. Root `Dockerfile` and `.dockerignore`
3. New `docker-compose.yml`
4. Frontend: `package.json` → `vite.config.js` → `src/api.js` → `src/main.jsx` → `src/App.jsx`
5. Update `frontend/.env.production` (after Logto App ID is known) and `frontend/.env`
6. Update root `.gitignore`
7. Delete: `nginx/`, `authelia/`, `backend/Dockerfile`, `.github/workflows/deploy.yml`
8. NAS setup (Steps 1–11 above)
