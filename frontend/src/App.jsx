import { NavLink, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getBeans } from "./api";
import BeanList from "./components/beans/BeanList";
import ContainerQRPage from "./pages/ContainerQRPage";

function ContainersPage() {
  return (
    <div
      style={{
        padding: "2rem",
        color: "var(--color-text-3)",
        textAlign: "center",
      }}
    >
      Containers — coming soon
    </div>
  );
}

function ShopsPage() {
  return (
    <div
      style={{
        padding: "2rem",
        color: "var(--color-text-3)",
        textAlign: "center",
      }}
    >
      Shops — coming soon
    </div>
  );
}

// ── App shell layout (header + tabs + page area) ──────────────────────────────
// This is only rendered for /beans, /containers, /shops.
// The QR page (/container/:id) bypasses this entirely.
function AppShell({ beanCount, setBeanCount }) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__top">
          <div className="app-brand">
            Beans
            <br />
            Tracker
          </div>
          {beanCount !== null && (
            <span className="app-pill">
              {beanCount} {beanCount === 1 ? "bean" : "beans"}
            </span>
          )}
        </div>

        <nav className="app-tabs" aria-label="Main navigation">
          <NavLink to="/beans" className="app-tab">
            {({ isActive }) => (
              <>
                <span className="app-tab__label">Beans</span>
                {isActive && <span className="app-tab__bar" />}
              </>
            )}
          </NavLink>

          <span className="app-tab-sep" aria-hidden="true">
            |
          </span>

          <NavLink to="/containers" className="app-tab">
            {({ isActive }) => (
              <>
                <span className="app-tab__label">Containers</span>
                {isActive && <span className="app-tab__bar" />}
              </>
            )}
          </NavLink>

          <span className="app-tab-sep" aria-hidden="true">
            |
          </span>

          <NavLink to="/shops" className="app-tab">
            {({ isActive }) => (
              <>
                <span className="app-tab__label">Shops</span>
                {isActive && <span className="app-tab__bar" />}
              </>
            )}
          </NavLink>
        </nav>
      </header>

      {/* Outlet renders whichever child route matches */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function App() {
  const [beanCount, setBeanCount] = useState(null);

  useEffect(() => {
    getBeans()
      .then((beans) => setBeanCount(beans.length))
      .catch(() => setBeanCount(0));
  }, []);

  return (
    <Routes>
      {/* Standalone route — no header, no tabs */}
      <Route path="/container/:id" element={<ContainerQRPage />} />

      {/* All other routes share the AppShell layout */}
      <Route
        element={<AppShell beanCount={beanCount} setBeanCount={setBeanCount} />}
      >
        <Route path="/" element={<Navigate to="/beans" replace />} />
        <Route
          path="/beans"
          element={<BeanList onCountChange={setBeanCount} />}
        />
        <Route path="/containers" element={<ContainersPage />} />
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="*" element={<Navigate to="/beans" replace />} />
      </Route>
    </Routes>
  );
}
