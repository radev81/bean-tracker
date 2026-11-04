// components/ui/BottomNav.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The fixed bottom navigation bar: Beans · Containers · (+) · Shops
// A fifth "Shots" tab can be added later (optional Phase B) via `showShots`.
//
// NavLink marks the current tab with aria-current="page" automatically;
// ui.css styles that state, so no extra logic is needed here.
// ─────────────────────────────────────────────────────────────────────────────

import { Link, NavLink } from "react-router-dom";
import "./ui.css";

const icons = {
  beans: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(30 12 12)" />
      <path d="M9 5.5c3 3 3 9 6 13" />
    </svg>
  ),
  containers: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="5" y="7" width="14" height="14" rx="3" />
      <path d="M7 3h10v4H7z" />
    </svg>
  ),
  shops: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 9l1.5-5h13L20 9" />
      <path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11z" />
      <path d="M5.5 14v6h13v-6" />
    </svg>
  ),
  shots: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M3 17l5-6 4 3 5-7 4 4" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

function Tab({ to, label, icon }) {
  return (
    // `end` so "/" (Beans) is only active on the list itself, not on every page
    <NavLink to={to} end={to === "/"} className="ui-nav__tab">
      {icons[icon]}
      <span className="ui-nav__label">{label}</span>
    </NavLink>
  );
}

export default function BottomNav({ addTo = "/new", showShots = false }) {
  return (
    <nav className="ui-nav" aria-label="Main navigation">
      <Tab to="/" label="Beans" icon="beans" />
      <Tab to="/containers" label="Containers" icon="containers" />
      <Link to={addTo} className="ui-nav__add" aria-label="Add a bean">
        {icons.add}
      </Link>
      <Tab to="/shops" label="Shops" icon="shops" />
      {showShots && <Tab to="/shots" label="Shots" icon="shots" />}
    </nav>
  );
}
