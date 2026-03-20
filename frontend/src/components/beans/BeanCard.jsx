// frontend/src/components/beans/BeanCard.jsx

import { useState } from "react";
import { getBeanById, toggleFavourite } from "../../api";
import "./BeanCard.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Small helper: the recipe row (In / Out / Time / Temp)
// ─────────────────────────────────────────────────────────────────────────────
function RecipeRow({ recipe }) {
  // Only build the items that actually have a value
  const items = [
    { key: "In", value: recipe.dose_in_g, unit: "g" },
    { key: "Out", value: recipe.yield_out_g, unit: "g" },
    { key: "Time", value: recipe.time_seconds, unit: "s" },
    { key: "Temp", value: recipe.temp_celsius, unit: "°" },
  ].filter((item) => item.value != null);

  if (items.length === 0) return null;

  return (
    <div className="bc-recipe">
      <div className="bc-recipe__label">
        {recipe.shot_type === "double" ? "Double" : "Single"} espresso
      </div>
      <div className="bc-recipe__row">
        {items.map((item, i) => (
          <div key={item.key} className="bc-recipe__item">
            <span className="bc-recipe__key">{item.key}</span>
            <span className="bc-recipe__val">
              {item.value}
              <span className="bc-recipe__unit">{item.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main BeanCard component
// ─────────────────────────────────────────────────────────────────────────────
export default function BeanCard({ bean, onFavouriteToggle }) {
  // Whether this card is currently showing its expanded body
  const [expanded, setExpanded] = useState(false);

  // Full details (tags + recipes) fetched on first expand.
  // We cache them here so re-expanding is instant.
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Whether the favourite API call is in flight (prevents double-taps)
  const [togglingFav, setTogglingFav] = useState(false);

  // ── Chevron click — expand / collapse ──────────────────────────────────────
  const handleChevronClick = async () => {
    if (!expanded && details === null) {
      // First expand: lazy-load tags + recipes
      setLoadingDetails(true);
      try {
        const data = await getBeanById(bean.id);
        setDetails(data);
      } catch (err) {
        console.error("Could not load bean details:", err.message);
        // Still expand the card — we just won't show tags/recipes
      } finally {
        setLoadingDetails(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  // ── Heart click — toggle favourite ─────────────────────────────────────────
  const handleFavClick = async (e) => {
    e.stopPropagation(); // safety: don't accidentally bubble to anything
    if (togglingFav) return; // ignore rapid double-taps
    setTogglingFav(true);
    try {
      await toggleFavourite(bean.id);
      // Tell BeanList to re-fetch so the card moves to the right section
      await onFavouriteToggle(bean.id);
    } catch (err) {
      console.error("Could not toggle favourite:", err.message);
    } finally {
      setTogglingFav(false);
    }
  };

  // ── Build the detail grid items (only non-empty fields) ───────────────────
  const gridItems = [
    { label: "Region", value: bean.region },
    { label: "Altitude", value: bean.altitude },
    { label: "SCA", value: bean.sca_score },
    { label: "Variety", value: bean.variety },
    { label: "Process", value: bean.processing },
    { label: "Farm", value: bean.farm_producer },
  ].filter((item) => item.value != null && item.value !== "");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`bc ${expanded ? "bc--expanded" : ""}`}>
      {/* Gradient left bar — only visible when expanded (CB-43) */}
      {expanded && <div className="bc__bar" aria-hidden="true" />}

      {/* ── Header row — always visible ─────────────────────────────────── */}
      <div className="bc__header">
        {/* Favourite heart (CB-44: visible on collapsed card too) */}
        <button
          className={`bc__fav ${bean.is_favourite ? "bc__fav--active" : ""}`}
          onClick={handleFavClick}
          disabled={togglingFav}
          aria-label={
            bean.is_favourite ? "Remove from favourites" : "Add to favourites"
          }
        >
          ♥
        </button>

        {/* Name + metadata */}
        <div className="bc__info">
          <div className="bc__name">{bean.name}</div>
          <div className="bc__meta">
            {[bean.country, bean.processing, bean.shop_name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        {/* Container badge (only if assigned) */}
        {bean.container_name && (
          <span className="bc__badge">{bean.container_name}</span>
        )}

        {/* Expand / collapse chevron (CB-42, CB-43, CB-45, CB-46) */}
        <button
          className={`bc__chevron ${expanded ? "bc__chevron--open" : ""}`}
          onClick={handleChevronClick}
          aria-label={expanded ? "Collapse card" : "Expand card"}
          aria-expanded={expanded}
        >
          ›
        </button>
      </div>

      {/* ── Expanded body ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="bc__body">
          {loadingDetails ? (
            <div className="bc__loading">Loading…</div>
          ) : (
            <>
              {/* Detail grid */}
              {gridItems.length > 0 && (
                <div className="bc__grid">
                  {gridItems.map((item) => (
                    <div key={item.label} className="bc__detail">
                      <span className="bc__detail-label">{item.label}</span>
                      <span className="bc__detail-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Flavour tags */}
              {details?.tags?.length > 0 && (
                <div className="bc__tags">
                  {details.tags.map((tag, i) => (
                    <span key={i} className="bc__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Tasting notes */}
              {bean.notes && <p className="bc__notes">"{bean.notes}"</p>}

              {/* Espresso recipes */}
              {details?.recipes?.length > 0 && (
                <div className="bc__recipes">
                  {details.recipes.map((recipe) => (
                    <RecipeRow key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}

              {/* Action buttons — Delete and Edit are disabled until those
                  phases are built. They're shown now so the layout matches
                  the design reference. */}
              <div className="bc__actions">
                <button className="bc__btn bc__btn--ghost" disabled>
                  Delete
                </button>
                <button className="bc__btn bc__btn--primary" disabled>
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
