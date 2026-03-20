// frontend/src/components/beans/BeanList.jsx

import { useState, useEffect, useCallback } from "react";
import { getBeans } from "../../api";
import BeanCard from "./BeanCard";
import EmptyState from "../common/EmptyState";
import "./BeanList.css";

export default function BeanList() {
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch all beans ───────────────────────────────────────────────────────
  // useCallback so we can safely call loadBeans from handleFavouriteToggle
  // without creating an infinite re-render loop.
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
  // Called by BeanCard when the heart is tapped.
  // We call the API then re-fetch the list so the card moves to the
  // correct section (Favourites ↔ All Beans) automatically.
  const handleFavouriteToggle = useCallback(
    async (beanId) => {
      try {
        await loadBeans();
      } catch (err) {
        console.error("handleFavouriteToggle:", err.message);
      }
    },
    [loadBeans],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="bean-list__loading">Loading beans…</div>;
  }

  if (error) {
    return <div className="bean-list__error">{error}</div>;
  }

  // CB-01: empty state
  if (beans.length === 0) {
    return (
      <EmptyState
        icon="☕"
        title="No beans yet"
        subtitle="Add your first bag to start tracking your collection."
        action="+ Add Coffee Beans"
      />
    );
  }

  // CB-52: favourites appear at the top in their own section
  const favourites = beans.filter((b) => b.is_favourite === 1);
  const nonFavourites = beans.filter((b) => b.is_favourite !== 1);

  return (
    <div className="bean-list">
      {/* Favourites section — only shown when at least one bean is a favourite */}
      {favourites.length > 0 && (
        <section className="bean-list__section">
          <div className="bean-list__section-header">
            <span className="bean-list__section-label">Favourites</span>
            <span className="bean-list__section-line" />
          </div>
          {favourites.map((bean) => (
            <BeanCard
              key={bean.id}
              bean={bean}
              onFavouriteToggle={handleFavouriteToggle}
            />
          ))}
        </section>
      )}

      {/* All Beans section — only shown when there are non-favourite beans */}
      {nonFavourites.length > 0 && (
        <section className="bean-list__section">
          <div className="bean-list__section-header">
            <span className="bean-list__section-label">All Beans</span>
            <span className="bean-list__section-line" />
          </div>
          {nonFavourites.map((bean) => (
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
