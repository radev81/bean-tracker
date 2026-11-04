// frontend/src/components/beans/BeanList.jsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../api";
import BeanCard from "./BeanCard";
import BeanSearch from "./BeanSearch";
import BeanFilter from "./BeanFilter";
import EmptyState from "../common/EmptyState";
import "./BeanList.css";

// The "empty" filter state — used to reset filters
const EMPTY_FILTERS = {
  favourites: false,
  shops: [],
  containers: [],
  countries: [],
};

// Deep-copy a filter object so changes to pendingFilters never mutate activeFilters
const copyFilters = (f) => ({
  favourites: f.favourites,
  shops: [...f.shops],
  containers: [...f.containers],
  countries: [...f.countries],
});

// onCountChange: tells the app header how many beans there are
export default function BeanList({ onCountChange }) {
  const api = useApi();
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Card expansion state ──────────────────────────────────────────────────
  // expandedId: the id of whichever card is currently expanded (null = none).
  // Adding and editing now happen on their own pages (/new, /bean/:id/edit).
  // When those pages send us back they pass { expandId } in the router state,
  // so the saved bean's card opens straight away.
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedId, setExpandedId] = useState(
    () => location.state?.expandId ?? null,
  );

  // Clear that router state once used, so a page refresh doesn't reopen it
  useEffect(() => {
    if (location.state?.expandId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // ── Swipe-to-reveal state — tracks which card's action strip is open ──────
  const [swipeOpenId, setSwipeOpenId] = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadBeans = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getBeans();
      setBeans(data);
      onCountChange?.(data.length);
    } catch (err) {
      setError("Could not load beans. Is the backend running?");
      console.error("loadBeans:", err.message);
    } finally {
      setLoading(false);
    }
  }, [api, onCountChange]);

  useEffect(() => {
    loadBeans();
  }, [loadBeans]);

  useEffect(() => {
    if (expandedId === null) return;
    // Timeout lets React finish rendering the expanded body before scrolling
    const timer = setTimeout(() => {
      const el = document.getElementById(`bean-${expandedId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(timer);
  }, [expandedId]);

  // ── Favourite toggle ──────────────────────────────────────────────────────
  const handleFavouriteToggle = useCallback(async () => {
    try {
      await loadBeans();
    } catch (err) {
      console.error("handleFavouriteToggle:", err.message);
    }
  }, [loadBeans]);

  // ── Card expand / collapse toggle ─────────────────────────────────────────
  // Passed down to every BeanCard. Tapping the expand icon on a collapsed
  // card sets expandedId to that card's id; tapping the collapse icon on
  // the already-open card sets expandedId back to null (CB-43 / CB-46).
  function handleCardToggle(beanId) {
    setExpandedId((prev) => (prev === beanId ? null : beanId));
  }

  // Called after a bean is deleted. Closes the card (in case it was open) and reloads the list to reflect the deletion.
  async function handleBeanDeleted() {
    setExpandedId(null); // close the card before it disappears
    await loadBeans(); // reload the list
  }
  // ── Filter panel handlers ─────────────────────────────────────────────────

  const handleFilterOpen = () => {
    setPendingFilters(copyFilters(activeFilters));
    setFilterPanelOpen(true);
  };

  const handleFilterClose = () => {
    setFilterPanelOpen(false);
  };

  const handleFilterApply = () => {
    setActiveFilters(copyFilters(pendingFilters));
    setFilterPanelOpen(false);
  };

  const handleFilterClearAll = () => {
    setPendingFilters(copyFilters(EMPTY_FILTERS));
  };

  const handleFilterClearFromList = () => {
    setActiveFilters(copyFilters(EMPTY_FILTERS));
  };

  // ── Derive available filter options from ALL beans ────────────────────────
  const availableShops = useMemo(
    () => [...new Set(beans.map((b) => b.shop_name).filter(Boolean))].sort(),
    [beans],
  );

  const availableContainers = useMemo(
    () =>
      [...new Set(beans.map((b) => b.container_name).filter(Boolean))].sort(),
    [beans],
  );

  const hasUnassigned = useMemo(
    () => beans.some((b) => !b.container_name),
    [beans],
  );

  const availableCountries = useMemo(
    () => [...new Set(beans.map((b) => b.country).filter(Boolean))].sort(),
    [beans],
  );

  // ── Count active filter types ─────────────────────────────────────────────
  const activeFilterCount = useMemo(
    () =>
      (activeFilters.favourites ? 1 : 0) +
      (activeFilters.shops.length > 0 ? 1 : 0) +
      (activeFilters.containers.length > 0 ? 1 : 0) +
      (activeFilters.countries.length > 0 ? 1 : 0),
    [activeFilters],
  );

  // ── Combined filtering ────────────────────────────────────────────────────
  const filteredBeans = useMemo(() => {
    let result = beans;

    if (activeFilters.favourites) {
      result = result.filter((b) => b.is_favourite === 1);
    }
    if (activeFilters.shops.length > 0) {
      result = result.filter((b) => activeFilters.shops.includes(b.shop_name));
    }
    if (activeFilters.containers.length > 0) {
      result = result.filter((b) => {
        if (!b.container_name) {
          return activeFilters.containers.includes("Unassigned");
        }
        return activeFilters.containers.includes(b.container_name);
      });
    }
    if (activeFilters.countries.length > 0) {
      result = result.filter((b) =>
        activeFilters.countries.includes(b.country),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((b) => {
        const haystack = [
          b.name,
          b.country,
          b.region,
          b.variety,
          b.shop_name,
          b.processing,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [beans, searchQuery, activeFilters]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="bean-list__loading">Loading beans…</div>;
  }

  if (error) {
    return <div className="bean-list__error">{error}</div>;
  }

  // ── Empty state (CB-01) ───────────────────────────────────────────────────
  // onAction wires the "Add Coffee Beans" button in the empty state to open
  // the form — previously this prop was passed but had no handler.
  if (beans.length === 0) {
    return (
      <>
        <BeanSearch
          query={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
          resultCount={0}
          onFilterClick={handleFilterOpen}
          onClearFilters={handleFilterClearFromList}
          activeFilterCount={activeFilterCount}
        />
        <EmptyState
          icon="☕"
          title="No beans yet"
          subtitle="Add your first bag to start tracking your collection."
          action="+ Add Coffee Beans"
          onAction={() => navigate("/new")}
        />
      </>
    );
  }

  const filteredFavourites = filteredBeans.filter((b) => b.is_favourite === 1);
  const filteredNonFavourites = filteredBeans.filter(
    (b) => b.is_favourite !== 1,
  );

  return (
    <div className="bean-list">
      {/* ── Search + Filter bar ────────────────────────────────────────── */}
      <BeanSearch
        query={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery("")}
        resultCount={filteredBeans.length}
        onFilterClick={handleFilterOpen}
        onClearFilters={handleFilterClearFromList}
        activeFilterCount={activeFilterCount}
      />

      {/* ── Filter panel (bottom sheet) ────────────────────────────────── */}
      <BeanFilter
        isOpen={filterPanelOpen}
        onClose={handleFilterClose}
        onApply={handleFilterApply}
        onClearAll={handleFilterClearAll}
        availableShops={availableShops}
        availableContainers={availableContainers}
        hasUnassigned={hasUnassigned}
        availableCountries={availableCountries}
        pending={pendingFilters}
        onPendingChange={setPendingFilters}
      />

      {/* ── No-results state (CB-05 / CB-14 / CB-20) ──────────────────── */}
      {filteredBeans.length === 0 && (
        <div className="bean-list__no-results">
          <div className="bean-list__no-results-icon">☕</div>
          <div className="bean-list__no-results-title">
            {searchQuery
              ? `No beans match "${searchQuery}"`
              : "No beans match the active filters"}
          </div>
          <div className="bean-list__no-results-sub">
            {searchQuery && activeFilterCount > 0
              ? "Try clearing the search or removing some filters."
              : searchQuery
                ? "Try a different name, origin, or shop."
                : "Try removing one or more filters."}
          </div>
          <div className="bean-list__no-results-actions">
            {searchQuery && (
              <button
                className="bean-list__no-results-clear"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                className="bean-list__no-results-clear"
                onClick={handleFilterClearFromList}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Favourites section ─────────────────────────────────────────── */}
      {filteredFavourites.length > 0 && (
        <section className="bean-list__section">
          <div className="bean-list__section-header">
            <span className="bean-list__section-label">Favourites</span>
            <span className="bean-list__section-line" />
          </div>
          {filteredFavourites.map((bean) => (
            <BeanCard
              key={bean.id}
              bean={bean}
              isExpanded={expandedId === bean.id}
              onToggle={handleCardToggle}
              onEdit={(b) => navigate(`/bean/${b.id}/edit`)}
              onFavouriteToggle={handleFavouriteToggle}
              onDelete={handleBeanDeleted}
              isSwipeOpen={swipeOpenId === bean.id}
              onSwipeOpen={() => setSwipeOpenId(bean.id)}
              onSwipeClose={() => setSwipeOpenId((prev) => prev === bean.id ? null : prev)}
            />
          ))}
        </section>
      )}

      {/* ── All Beans section ──────────────────────────────────────────── */}
      {filteredNonFavourites.length > 0 && (
        <section className="bean-list__section">
          <div className="bean-list__section-header">
            <span className="bean-list__section-label">All Beans</span>
            <span className="bean-list__section-line" />
          </div>
          {filteredNonFavourites.map((bean) => (
            <BeanCard
              key={bean.id}
              bean={bean}
              isExpanded={expandedId === bean.id}
              onToggle={handleCardToggle}
              onEdit={(b) => navigate(`/bean/${b.id}/edit`)}
              onFavouriteToggle={handleFavouriteToggle}
              onDelete={handleBeanDeleted}
              isSwipeOpen={swipeOpenId === bean.id}
              onSwipeOpen={() => setSwipeOpenId(bean.id)}
              onSwipeClose={() => setSwipeOpenId((prev) => prev === bean.id ? null : prev)}
            />
          ))}
        </section>
      )}

      {/* Adding a bean: the + button in the bottom navigation (→ /new) */}
    </div>
  );
}
