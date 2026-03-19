/**
 * App.jsx — Beans Tracker shell
 * ─────────────────────────────
 * Renders:
 *   • Fixed header (brand + bean count pill)
 *   • Tab bar: Beans | Containers | Shops
 *   • A <main> area where each tab's page lives
 *
 * React Router handles which tab is visible.
 * The header is always visible regardless of route.
 */

import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getBeans } from "./api";
import BeanList from "./components/beans/BeanList";

// Placeholder pages — we'll build these in later phases
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

export default function App() {
  // We keep the bean count here so the header pill always stays accurate
  // even when BeanList re-fetches. BeanList will call this to notify us.
  const [beanCount, setBeanCount] = useState(null); // null = loading

  useEffect(() => {
    getBeans()
      .then((beans) => setBeanCount(beans.length))
      .catch(() => setBeanCount(0));
  }, []);

  return (
    <div className="app">
      {/* ── Fixed header ── */}
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

        {/* ── Tab bar ── */}
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

      {/* ── Page content ── */}
      <main className="app-main">
        <Routes>
          {/* Redirect root to /beans */}
          <Route path="/" element={<Navigate to="/beans" replace />} />

          <Route
            path="/beans"
            element={
              <BeanList
                // When BeanList saves/deletes a bean, it calls this
                // so the header pill count stays up to date
                onCountChange={setBeanCount}
              />
            }
          />

          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/shops" element={<ShopsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/beans" replace />} />
        </Routes>
      </main>
    </div>
  );
}
