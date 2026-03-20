// frontend/src/components/beans/BeanList.jsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBeans } from "../../api";
import BeanCard from "./BeanCard";
import BeanSearch from "./BeanSearch";
import EmptyState from "../common/EmptyState";
import "./BeanList.css";

export default function BeanList() {
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Fetch all beans ───────────────────────────────────────────────────────
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
  // BeanCard has already called the API. We just need to re-fetch the list
  // so the card moves to/from the Favourites section.
  const handleFavouriteToggle = useCallback(async () => {
    try {
      await loadBeans();
    } catch (err) {
      console.error("handleFavouriteToggle:", err.message);
    }
  }, [loadBeans]);

  // ── Search filtering (CB-04, CB-07) ───────────────────────────────────────
  // useMemo means this only recalculates when beans or searchQuery changes —
  // not on every render. Keeps the UI snappy with 30+ cards.
  const filteredBeans = useMemo(() => {
    if (!searchQuery.trim()) return beans; // no query → show all

    const q = searchQuery.trim().toLowerCase();
    return beans.filter((bean) => {
      // Search across: name, country, region, variety, shop name, processing
      const haystack = [
        bean.name,
        bean.country,
        bean.region,
        bean.variety,
        bean.shop_name,
        bean.processing,
      ]
        .filter(Boolean) // drop nulls/undefined
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [beans, searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchChange = (value) => setSearchQuery(value);
  const handleSearchClear = () => setSearchQuery("");

  // Placeholder — the filter panel will be built in the next phase
  const handleFilterClick = () => {
    // TODO: open filter panel (CB-09)
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="bean-list__loading">Loading beans…</div>;
  }

  if (error) {
    return <div className="bean-list__error">{error}</div>;
  }

  // CB-01: completely empty database
  if (beans.length === 0) {
    return (
      <>
        <BeanSearch
          query={searchQuery}
          onChange={handleSearchChange}
          onClear={handleSearchClear}
          resultCount={0}
          totalCount={0}
          onFilterClick={handleFilterClick}
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

  // Split filtered list into Favourites / All Beans sections (CB-52)
  const filteredFavourites = filteredBeans.filter((b) => b.is_favourite === 1);
  const filteredNonFavourites = filteredBeans.filter(
    (b) => b.is_favourite !== 1,
  );

  return (
    <div className="bean-list">
      {/* ── Search bar (CB-03) ─────────────────────────────────────────── */}
      <BeanSearch
        query={searchQuery}
        onChange={handleSearchChange}
        onClear={handleSearchClear}
        resultCount={filteredBeans.length}
        totalCount={beans.length}
        onFilterClick={handleFilterClick}
      />

      {/* ── No-results state (CB-05) ───────────────────────────────────── */}
      {filteredBeans.length === 0 && (
        <div className="bean-list__no-results">
          <div className="bean-list__no-results-icon">☕</div>
          <div className="bean-list__no-results-title">
            No beans match "{searchQuery}"
          </div>
          <div className="bean-list__no-results-sub">
            Try a different name, origin, or shop.
          </div>
          <button
            className="bean-list__no-results-clear"
            onClick={handleSearchClear}
          >
            Clear search
          </button>
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
