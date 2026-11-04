import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { ApiContext, createApiClient } from "./api";
import BeanList from "./components/beans/BeanList";
import ContainerQRPage from "./pages/ContainerQRPage";
import ContainerList from "./components/containers/ContainerList";
import ShopList from "./components/shops/ShopList";
import BeanFormPage from "./pages/BeanFormPage";
import {
  BottomNav,
  Button,
  PageHeader,
  Segmented,
  SectionLabel,
  Sheet,
} from "./components/ui";
// TEMPORARY (step 2): preview of the new UI building blocks — remove before merging
import UiKit from "./pages/UiKit";

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

// ── Page titles for the three main tabs ───────────────────────────────────────
// The shell shows a header with a small caps "eyebrow" line and a big title.
function pageInfo(pathname, beanCount) {
  if (pathname.startsWith("/containers")) return { title: "Containers" };
  if (pathname.startsWith("/shops")) return { title: "Shops" };
  return {
    title: "Beans",
    eyebrow:
      beanCount === null
        ? null
        : `${beanCount} ${beanCount === 1 ? "bean" : "beans"}`,
  };
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

// ── App shell layout (header + page + bottom navigation) ──────────────────────
// Used for the three main tabs: / (Beans), /containers and /shops.
// The QR page, the bean form and the kit page are full-screen and skip this.
function AppShell({ beanCount, onSignOut, theme, onThemeChange }) {
  const { pathname } = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const { title, eyebrow } = pageInfo(pathname, beanCount);

  return (
    <div className="app ui-has-nav">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        actions={
          <Button
            icon
            variant="secondary"
            aria-label="Account: theme and sign out"
            onClick={() => setAccountOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Button>
        }
      />

      {/* Outlet renders whichever child route matches */}
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

  const [beanCount, setBeanCount] = useState(null);
  const [api] = useState(() => createApiClient(getAccessToken));
  const { theme, setTheme } = useTheme();

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
      <SignIn
        onSignIn={() =>
          signIn(`${window.location.origin}${import.meta.env.BASE_URL}callback`)
        }
      />
    );
  }

  // Bean added/edited/deleted elsewhere → refresh the count in the header
  const refreshCount = () =>
    api
      .getBeans()
      .then((beans) => setBeanCount(beans.length))
      .catch(() => {});

  return (
    <ApiContext.Provider value={api}>
      <Routes>
        {/* ── Full-screen routes (no header, no bottom navigation) ───────── */}
        <Route path="/container/:id" element={<ContainerQRPage />} />
        <Route path="/new" element={<BeanFormPage onSaved={refreshCount} />} />
        <Route
          path="/bean/:id/edit"
          element={<BeanFormPage onSaved={refreshCount} />}
        />

        {/* TEMPORARY (step 2): UI kit preview at /beans/kit — remove before merging */}
        <Route path="/kit" element={<UiKit />} />

        {/* ── Main tabs: share the AppShell layout ───────────────────────── */}
        <Route
          element={
            <AppShell
              beanCount={beanCount}
              // Keep this exactly as registered in Logto ("post sign-out
              // redirect URI") — Logto rejects anything that doesn't match.
              onSignOut={() => signOut(window.location.origin)}
              theme={theme}
              onThemeChange={setTheme}
            />
          }
        >
          <Route
            path="/"
            element={<BeanList onCountChange={setBeanCount} />}
          />
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
