import { NavLink, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { ApiContext, createApiClient } from "./api";
import BeanList from "./components/beans/BeanList";
import ContainerQRPage from "./pages/ContainerQRPage";
import ContainerList from "./components/containers/ContainerList";
import ShopList from "./components/shops/ShopList";

// ── Theme management ──────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bt-theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bt-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

// ── App shell layout (header + tabs + page area) ──────────────────────────────
// This is only rendered for /beans, /containers, /shops.
// The QR page (/container/:id) bypasses this entirely.
function AppShell({ beanCount, onSignOut, theme, onToggleTheme }) {
  const iconSrc =
    theme === "dark"
      ? `${import.meta.env.BASE_URL}favicon-96x96.png`
      : `${import.meta.env.BASE_URL}favicon-96x96-light.png`;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__top">
          <div className="app-brand-wrap">
            <img className="app-brand-icon" src={iconSrc} alt="" />
            <div className="app-brand">
              Beans
              <br />
              <span>Tracker</span>
            </div>
          </div>
          <div className="app-header-actions">
            <button
              className="app-theme-toggle"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="app-signout" onClick={onSignOut}>
              Sign out
            </button>
          </div>
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

          {beanCount !== null && (
            <span className="app-pill">
              {beanCount} {beanCount === 1 ? "bean" : "beans"}
            </span>
          )}
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
  const [api] = useState(() => createApiClient(getAccessToken));
  const { theme, toggle: toggleTheme } = useTheme();

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
          <span>Tracker</span>
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
              theme={theme}
              onToggleTheme={toggleTheme}
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
