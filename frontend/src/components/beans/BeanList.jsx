/**
 * BeanList.jsx — Beans tab main view
 * ────────────────────────────────────
 * BDD scenarios covered:
 *   CB-01  Empty state (no beans in DB)
 *   CB-02  List with beans — all cards shown collapsed
 *          Favourites section at top, All Beans section below (CB-52)
 *
 * Props:
 *   onCountChange  fn(number)  — called whenever the bean count changes
 *                                so App.jsx can update the header pill
 */

import { useEffect, useState } from "react";
import { getBeans } from "../../api";
import BeanCard from "./BeanCard";
import EmptyState from "../common/EmptyState";
import "./BeanList.css";

export default function BeanList({ onCountChange }) {
  // ── State ────────────────────────────────────────────────────────────────
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    loadBeans();
  }, []);

  async function loadBeans() {
    try {
      setLoading(true);
      setError(null);
      const data = await getBeans();
      setBeans(data);
      onCountChange?.(data.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived lists (CB-52: favourites first) ──────────────────────────────
  const favourites = beans.filter((b) => b.is_favourite);
  const others = beans.filter((b) => !b.is_favourite);

  // ── Event handlers (stubs — full logic in later phases) ──────────────────
  function handleExpand(bean) {
    // CB-43 — expand card — coming in Phase 4
    console.log("expand", bean.id);
  }

  function handleFavClick(bean) {
    // CB-47/48 — toggle favourite — coming in Phase 4
    console.log("fav toggle", bean.id);
  }

  function handleAddClick() {
    // CB-25 — show add form — coming in Phase 4
    console.log("add bean");
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // Loading skeleton — keeps the UI from jumping
  if (loading) {
    return (
      <div
        className="bean-list bean-list--loading"
        aria-busy="true"
        aria-label="Loading beans…"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="bean-list__skeleton" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load beans"
        body={`${error}. Make sure the backend is running on the configured URL.`}
        action="Try again"
        onAction={loadBeans}
      />
    );
  }

  // ── CB-01 — Empty state ──────────────────────────────────────────────────
  if (beans.length === 0) {
    return (
      <EmptyState
        icon="☕"
        title="No beans yet"
        body="Add your first bag to start tracking your collection."
        action="+ Add Coffee Beans"
        onAction={handleAddClick}
      />
    );
  }

  // ── CB-02 — List with beans ──────────────────────────────────────────────
  return (
    <div className="bean-list">
      {/* Search bar — CB-03 (Phase 4) */}
      <div className="bean-list__search-wrap">
        <div className="bean-list__search">
          <span className="bean-list__search-icon" aria-hidden="true">
            ⌕
          </span>
          <span className="bean-list__search-placeholder">
            Search beans, origin, shop…
          </span>
          <button className="bean-list__filter-btn" aria-label="Open filters">
            Filter
          </button>
        </div>
      </div>

      {/* ── Favourites section ── */}
      {favourites.length > 0 && (
        <section aria-label="Favourite beans">
          <div className="bean-list__section-header">
            <span className="bean-list__section-label">Favourites</span>
            <span className="bean-list__section-line" aria-hidden="true" />
          </div>
          <ul className="bean-list__cards" role="list">
            {favourites.map((bean) => (
              <li key={bean.id}>
                <BeanCard
                  bean={bean}
                  onExpand={handleExpand}
                  onFavClick={handleFavClick}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── All Beans section ── */}
      <section aria-label="All beans">
        <div className="bean-list__section-header">
          <span className="bean-list__section-label">All Beans</span>
          <span className="bean-list__section-line" aria-hidden="true" />
        </div>
        <ul className="bean-list__cards" role="list">
          {others.map((bean) => (
            <li key={bean.id}>
              <BeanCard
                bean={bean}
                onExpand={handleExpand}
                onFavClick={handleFavClick}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ── Add button — fixed at bottom ── */}
      <div className="bean-list__add-wrap">
        <button className="bean-list__add-btn" onClick={handleAddClick}>
          + Add Coffee Beans
        </button>
      </div>
    </div>
  );
}
