import { NavLink, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useLogto } from "@logto/react";
import { ApiContext, createApiClient } from "./api";
import BeanList from "./components/beans/BeanList";
import ContainerQRPage from "./pages/ContainerQRPage";
import ContainerList from "./components/containers/ContainerList";
import ShopList from "./components/shops/ShopList";

// ── App shell layout (header + tabs + page area) ──────────────────────────────
// This is only rendered for /beans, /containers, /shops.
// The QR page (/container/:id) bypasses this entirely.
function AppShell({ beanCount, onSignOut }) {
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
          <button className="app-signout" onClick={onSignOut}>
            Sign out
          </button>
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
  const {
    isAuthenticated,
    isLoading: authLoading,
    signIn,
    signOut,
    getAccessToken,
  } = useLogto();

  const [beanCount, setBeanCount] = useState(null);

  const api = useMemo(() => createApiClient(getAccessToken), [getAccessToken]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getBeans()
      .then((beans) => setBeanCount(beans.length))
      .catch(() => setBeanCount(0));
  }, [isAuthenticated, api]);

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="app-splash">
        <div className="app-brand app-brand--large">
          Beans
          <br />
          Tracker
        </div>
        <button
          className="app-splash__btn"
          onClick={() => signIn(`${window.location.origin}/beans/callback`)}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <ApiContext.Provider value={api}>
      <Routes>
        {/* Standalone route — no header, no tabs */}
        <Route path="/container/:id" element={<ContainerQRPage />} />

        {/* All other routes share the AppShell layout */}
        <Route
          element={
            <AppShell
              beanCount={beanCount}
              onSignOut={() => signOut(window.location.origin)}
            />
          }
        >
          <Route path="/" element={<Navigate to="/beans" replace />} />
          <Route
            path="/beans"
            element={<BeanList onCountChange={setBeanCount} />}
          />
          <Route path="/containers" element={<ContainerList />} />
          <Route path="/shops" element={<ShopList />} />
          <Route path="*" element={<Navigate to="/beans" replace />} />
        </Route>
      </Routes>
    </ApiContext.Provider>
  );
}
