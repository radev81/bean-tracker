import { useState, useEffect } from "react";
import { useApi } from "../../api";
import Dialog from "../common/Dialog";
import "./BeanCard.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Small helper: the recipe row (In / Out / Time / Temp)
// ─────────────────────────────────────────────────────────────────────────────
function RecipeRow({ recipe }) {
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
        {items.map((item) => (
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
//
//  Props:
//    bean              — the bean object from the list
//    isExpanded        — controlled by BeanList; true = show body
//    onToggle          — called with bean.id to flip expanded state in BeanList
//    onFavouriteToggle — called after a favourite change so BeanList reloads
// ─────────────────────────────────────────────────────────────────────────────
export default function BeanCard({
  bean,
  isExpanded,
  onToggle,
  onEdit,
  onFavouriteToggle,
  onDelete,
}) {
  const api = useApi();

  // Full details (tags + recipes) fetched on first expand and cached here
  // so re-expanding is instant.
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Whether the favourite API call is in flight (prevents double-taps)
  const [togglingFav, setTogglingFav] = useState(false);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Lazy-load details whenever the card becomes expanded ───────────────────
  // Using useEffect instead of inside the click handler means programmatic
  // expansion (after save, or "View existing") also triggers the fetch
  // correctly, not just manual chevron taps.
  useEffect(() => {
    if (isExpanded && details === null && !loadingDetails) {
      setLoadingDetails(true);
      api.getBeanById(bean.id)
        .then((data) => setDetails(data))
        .catch((err) =>
          console.error("Could not load bean details:", err.message),
        )
        .finally(() => setLoadingDetails(false));
    }
  }, [isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: we intentionally only re-run when isExpanded changes, not on every
  // render. details/loadingDetails/bean.id are stable within a card's lifetime.

  // ── Chevron click — tell BeanList to toggle this card ─────────────────────
  const handleChevronClick = () => {
    onToggle(bean.id);
  };

  // ── Heart click — toggle favourite ─────────────────────────────────────────
  const handleFavClick = async (e) => {
    e.stopPropagation();
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      await api.toggleFavourite(bean.id);
      await onFavouriteToggle(bean.id);
    } catch (err) {
      console.error("Could not toggle favourite:", err.message);
    } finally {
      setTogglingFav(false);
    }
  };

  // ── Delete click — show confirmation dialog ───────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteBean(bean.id);
      onDelete(bean.id); // tell BeanList to reload and close the card
    } catch (err) {
      console.error("Could not delete bean:", err.message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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
    <div
      id={`bean-${bean.id}`}
      className={`bc ${isExpanded ? "bc--expanded" : ""}`}
    >
      {/* Gradient left bar — only visible when expanded (CB-43) */}
      {isExpanded && <div className="bc__bar" aria-hidden="true" />}

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
          className={`bc__chevron ${isExpanded ? "bc__chevron--open" : ""}`}
          onClick={handleChevronClick}
          aria-label={isExpanded ? "Collapse card" : "Expand card"}
          aria-expanded={isExpanded}
        >
          ›
        </button>
      </div>

      {/* ── Expanded body ───────────────────────────────────────────────── */}
      {isExpanded && (
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

              {/* Action buttons */}
              <div className="bc__actions">
                <button
                  className="bc__btn bc__btn--ghost"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </button>
                <button
                  className="bc__btn bc__btn--primary"
                  onClick={() => onEdit(bean)}
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showDeleteDialog && (
        <Dialog
          icon="🗑"
          title={`Delete ${bean.name}?`}
          body={
            bean.container_name
              ? `This will permanently remove the card and unassign it from ${bean.container_name}. This cannot be undone.`
              : "This will permanently remove the card. This cannot be undone."
          }
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => setShowDeleteDialog(false),
            },
            {
              label: deleting ? "Deleting…" : "Delete",
              variant: "danger",
              onClick: handleDeleteConfirm,
            },
          ]}
        />
      )}
    </div>
  );
}
