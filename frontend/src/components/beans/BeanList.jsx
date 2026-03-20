// frontend/src/components/beans/BeanList.jsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBeans } from "../../api";
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

export default function BeanList() {
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadBeans = useCallback(async () => {
    try {
      setError(null);
      const data = await getBeans();
      setBeans(data);
    } catch (err) {
      setError("Could not load beans. Is the backend running?");
      console.error("loadBeans:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeans();
  }, [loadBeans]);

  // ── Favourite toggle ──────────────────────────────────────────────────────
  const handleFavouriteToggle = useCallback(async () => {
    try {
      await loadBeans();
    } catch (err) {
      console.error("handleFavouriteToggle:", err.message);
    }
  }, [loadBeans]);

  // ── Filter panel handlers ─────────────────────────────────────────────────

  // Open panel — copy activeFilters into pending so the panel shows
  // the current applied state (CB-24 requirement: close without Apply
  // must restore to whatever was active before opening)
  const handleFilterOpen = () => {
    setPendingFilters(copyFilters(activeFilters));
    setFilterPanelOpen(true);
  };

  // Close panel WITHOUT applying — throw away pendingFilters (CB-24)
  const handleFilterClose = () => {
    setFilterPanelOpen(false);
  };

  // Apply button — copy pending → active, close panel
  const handleFilterApply = () => {
    setActiveFilters(copyFilters(pendingFilters));
    setFilterPanelOpen(false);
  };

  // Clear all button INSIDE the panel — resets pending but doesn't apply (CB-22)
  const handleFilterClearAll = () => {
    setPendingFilters(copyFilters(EMPTY_FILTERS));
  };

  // Clear-all button on the search bar — clears active filters immediately (CB-23)
  const handleFilterClearFromList = () => {
    setActiveFilters(copyFilters(EMPTY_FILTERS));
  };

  // ── Derive available filter options from ALL beans (not filtered) ─────────
  // We use all beans (not filteredBeans) so the filter lists stay stable
  // as you make selections — they don't shrink as you narrow down.
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

  // ── Count active filter types (drives the badge on the Filter button) ─────
  const activeFilterCount = useMemo(
    () =>
      (activeFilters.favourites ? 1 : 0) +
      (activeFilters.shops.length > 0 ? 1 : 0) +
      (activeFilters.containers.length > 0 ? 1 : 0) +
      (activeFilters.countries.length > 0 ? 1 : 0),
    [activeFilters],
  );

  // ── Combined filtering: active filters + search query ─────────────────────
  // Order: apply filters first, then narrow with search on top.
  // This matches CB-07 (search respects active filters) and CB-08 (clear
  // search while filters active → filter results remain).
  const filteredBeans = useMemo(() => {
    let result = beans;

    // ── Active filters ────────────────────────────────────────────────
    // CB-13: favourites filter
    if (activeFilters.favourites) {
      result = result.filter((b) => b.is_favourite === 1);
    }
    // CB-15: shop filter (OR within the type)
    if (activeFilters.shops.length > 0) {
      result = result.filter((b) => activeFilters.shops.includes(b.shop_name));
    }
    // CB-16 + CB-17: container filter (Unassigned is a special value)
    if (activeFilters.containers.length > 0) {
      result = result.filter((b) => {
        if (!b.container_name) {
          return activeFilters.containers.includes("Unassigned");
        }
        return activeFilters.containers.includes(b.container_name);
      });
    }
    // CB-18: country of origin filter
    if (activeFilters.countries.length > 0) {
      result = result.filter((b) =>
        activeFilters.countries.includes(b.country),
      );
    }

    // ── Search on top of filtered results (CB-07) ─────────────────────
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
              onFavouriteToggle={handleFavouriteToggle}
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
              onFavouriteToggle={handleFavouriteToggle}
            />
          ))}
        </section>
      )}
    </div>
  );
}
