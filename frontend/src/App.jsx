import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLogto } from "@logto/react";
import { ApiContext, createApiClient } from "./api";
import { ShellContext } from "./shell";
import BeanList from "./components/beans/BeanList";
import ContainerQRPage from "./pages/ContainerQRPage";
import ContainerList from "./components/containers/ContainerList";
import ShopList from "./components/shops/ShopList";
import BeanFormPage from "./pages/BeanFormPage";
import BeanDetail from "./pages/BeanDetail";
import DialIn from "./pages/DialIn";
import {
  BottomNav,
  Button,
  Segmented,
  SectionLabel,
  Sheet,
} from "./components/ui";

// ── Theme management ──────────────────────────────────────────────────────────
// The chosen theme is stored in localStorage and applied to <html data-theme>.
// index.html applies it before React loads, so there is no flash on start-up.
function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bt-theme") || "dark",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bt-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

// ── Account sheet: theme + sign out ───────────────────────────────────────────
function AccountSheet({ open, onClose, theme, onThemeChange, onSignOut }) {
  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <SectionLabel as="h3">Theme</SectionLabel>
      <Segmented
        ariaLabel="Theme"
        value={theme}
        onChange={onThemeChange}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
        ]}
      />
      <Button variant="secondary" block onClick={onSignOut}>
        Sign out
      </Button>
    </Sheet>
  );
}

// ── App shell layout (page + bottom navigation) ───────────────────────────────
// Used for the three main tabs: / (Beans), /containers and /shops.
// Each page draws its own header (title, counts, actions) and puts an
// <AccountButton /> in it; that button opens the account sheet below via
// ShellContext. Full-screen pages (bean detail, forms, QR) skip this shell.
function AppShell({ onSignOut, theme, onThemeChange }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const openAccount = useCallback(() => setAccountOpen(true), []);
  const shell = useMemo(() => ({ openAccount }), [openAccount]);

  return (
    <ShellContext.Provider value={shell}>
      <div className="app ui-has-nav">
        <main className="app-main">
          <Outlet />
        </main>

        <BottomNav />

        <AccountSheet
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          theme={theme}
          onThemeChange={onThemeChange}
          onSignOut={onSignOut}
        />
      </div>
    </ShellContext.Provider>
  );
}

// ── Sign-in screen ────────────────────────────────────────────────────────────
function SignIn({ onSignIn }) {
  return (
    <main className="app-signin">
      <img
        className="app-signin__icon"
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        width="56"
        height="56"
        alt=""
      />
      <span className="ui-eyebrow">Specialty coffee</span>
      <h1 className="app-signin__title">Beans Tracker</h1>
      <p className="app-signin__text">
        Your beans, shops, containers and espresso recipes in one place.
      </p>
      <Button variant="primary" onClick={onSignIn} className="app-signin__btn">
        Sign in
      </Button>
    </main>
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

  const [api] = useState(() => createApiClient(getAccessToken));
  const { theme, setTheme } = useTheme();

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <SignIn
        onSignIn={() =>
          signIn(`${window.location.origin}${import.meta.env.BASE_URL}callback`)
        }
      />
    );
  }

  return (
    <ApiContext.Provider value={api}>
      <Routes>
        {/* ── Full-screen routes (no bottom navigation) ──────────────────── */}
        <Route path="/container/:id" element={<ContainerQRPage />} />
        <Route path="/new" element={<BeanFormPage />} />
        <Route path="/bean/:id" element={<BeanDetail />} />
        <Route path="/bean/:id/edit" element={<BeanFormPage />} />
        <Route path="/bean/:id/dial" element={<DialIn />} />

        {/* ── Main tabs: share the AppShell layout ───────────────────────── */}
        <Route
          element={
            <AppShell
              // Keep this exactly as registered in Logto ("post sign-out
              // redirect URI") — Logto rejects anything that doesn't match.
              onSignOut={() => signOut(window.location.origin)}
              theme={theme}
              onThemeChange={setTheme}
            />
          }
        >
          <Route path="/" element={<BeanList />} />
          {/* Old address /beans/beans (bookmarks) → bean list */}
          <Route path="/beans" element={<Navigate to="/" replace />} />
          <Route path="/containers" element={<ContainerList />} />
          <Route path="/shops" element={<ShopList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ApiContext.Provider>
  );
}
