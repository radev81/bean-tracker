import { useState, useEffect } from "react";
import { useApi } from "../../api";
import Dialog from "../common/Dialog";
import "./BeanCard.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Format a number to at most 1 decimal place, stripping trailing zeros.
// e.g.  9.0 → 9    9.50 → 9.5
function fmt(val) {
  if (val == null) return null;
  return parseFloat(val.toFixed(1));
}

// Compute ratio string from dose_in_g / yield_out_g.
// Always derived live so it stays consistent with edits.
// Returns e.g. "1:2" or "1:2.2", or null when inputs are missing / zero.
function computeRatio(inG, outG) {
  if (!inG || !outG || inG <= 0) return null;
  return `1:${parseFloat((outG / inG).toFixed(1))}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RecipeSection
//
//  Shows espresso recipe values with a Double / Single pill toggle.
//
//  Double (default): values straight from the DB.
//  Single:           In and Out divided by 2, Time replaced with "?",
//                    Temp and Ratio unchanged (ratio is scale-invariant:
//                    (out/2)/(in/2) = out/in).
//
//  Legacy single-only records (older imported data) are shown without a
//  toggle since there is nothing to toggle to.
//
//  Toggle state resets to "double" every time the card collapses, because
//  this component unmounts whenever the expanded body unmounts.
// ─────────────────────────────────────────────────────────────────────────────
function RecipeSection({ recipes }) {
  const [showSingle, setShowSingle] = useState(false);

  const doubleRecipe = recipes?.find((r) => r.shot_type === "double");
  const singleOnly =
    !doubleRecipe && recipes?.find((r) => r.shot_type === "single");

  // ── Legacy path: single-only record (no toggle) ───────────────────────────
  if (singleOnly) {
    const r = singleOnly;
    const ratio = computeRatio(r.dose_in_g, r.yield_out_g);
    const items = [
      { label: "In", value: r.dose_in_g, unit: "g" },
      { label: "Out", value: r.yield_out_g, unit: "g" },
      { label: "Time", value: r.time_seconds, unit: "s" },
      { label: "Temp", value: r.temp_celsius, unit: "°" },
      ...(ratio ? [{ label: "Ratio", value: ratio, unit: "" }] : []),
    ].filter((i) => i.value != null && i.value !== "");

    if (items.length === 0) return null;

    return (
      <div className="bc-recipe">
        <div className="bc-recipe__label">Single espresso</div>
        <div className="bc-recipe__row">
          {items.map((item) => (
            <div key={item.label} className="bc-recipe__item">
              <span className="bc-recipe__key">{item.label}</span>
              <span className="bc-recipe__val">
                {item.value}
                {item.unit && (
                  <span className="bc-recipe__unit">{item.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!doubleRecipe) return null;

  // ── Main path: double recipe with Double / Single toggle ──────────────────
  const inVal =
    showSingle && doubleRecipe.dose_in_g != null
      ? fmt(doubleRecipe.dose_in_g / 2)
      : doubleRecipe.dose_in_g;

  const outVal =
    showSingle && doubleRecipe.yield_out_g != null
      ? fmt(doubleRecipe.yield_out_g / 2)
      : doubleRecipe.yield_out_g;

  // Time shows "?" in single mode — can't reliably halve extraction time.
  const timeVal = showSingle ? "?" : doubleRecipe.time_seconds;
  const timeUnit = showSingle ? "" : "s";

  // Ratio is scale-invariant; always calculated from the double values.
  const ratio = computeRatio(doubleRecipe.dose_in_g, doubleRecipe.yield_out_g);

  const items = [
    { label: "In", value: inVal, unit: "g" },
    { label: "Out", value: outVal, unit: "g" },
    { label: "Time", value: timeVal, unit: timeUnit },
    { label: "Temp", value: doubleRecipe.temp_celsius, unit: "°" },
    ...(ratio ? [{ label: "Ratio", value: ratio, unit: "" }] : []),
  ].filter((i) => i.value != null && i.value !== "");

  if (items.length === 0) return null;

  return (
    <div className="bc-recipe">
      {/* Header: label + Double / Single pill toggle */}
      <div className="bc-recipe__header">
        <span className="bc-recipe__label">Espresso</span>
        <button
          className="bc-recipe__toggle"
          onClick={() => setShowSingle((prev) => !prev)}
          aria-label={
            showSingle ? "Switch to double shot" : "Switch to single shot"
          }
        >
          <span
            className={`bc-recipe__toggle-opt ${!showSingle ? "bc-recipe__toggle-opt--active" : ""}`}
          >
            Double
          </span>
          <span
            className={`bc-recipe__toggle-opt ${showSingle ? "bc-recipe__toggle-opt--active" : ""}`}
          >
            Single
          </span>
        </button>
      </div>

      <div className="bc-recipe__row">
        {items.map((item) => (
          <div key={item.label} className="bc-recipe__item">
            <span className="bc-recipe__key">{item.label}</span>
            <span className="bc-recipe__val">
              {item.value}
              {item.unit && (
                <span className="bc-recipe__unit">{item.unit}</span>
              )}
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
//    bean              — bean object from the list
//    isExpanded        — controlled by BeanList; true = show body
//    onToggle          — called with bean.id to flip expanded state
//    onFavouriteToggle — called after a favourite change so BeanList reloads
//    onEdit            — called with bean to open BeanForm in edit mode
//    onDelete          — called with bean.id after successful delete
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

  // Full details (tags + recipes) — fetched once on first expand, then cached.
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Guards against double-taps on the favourite heart.
  const [togglingFav, setTogglingFav] = useState(false);

  // Delete confirmation dialog state.
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Lazy-load full bean details on first expand ───────────────────────────
  useEffect(() => {
    if (isExpanded && details === null && !loadingDetails) {
      setLoadingDetails(true);
      api
        .getBeanById(bean.id)
        .then((data) => setDetails(data))
        .catch((err) =>
          console.error("Could not load bean details:", err.message),
        )
        .finally(() => setLoadingDetails(false));
    }
  }, [isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleChevronClick = () => onToggle(bean.id);

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

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteBean(bean.id);
      onDelete(bean.id);
    } catch (err) {
      console.error("Could not delete bean:", err.message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ── Detail grid — only non-empty fields ──────────────────────────────────
  const gridItems = [
    { label: "Region", value: bean.region },
    { label: "Altitude", value: bean.altitude },
    { label: "SCA", value: bean.sca_score },
    { label: "Variety", value: bean.variety },
    { label: "Process", value: bean.processing },
    { label: "Farm", value: bean.farm_producer },
  ].filter((item) => item.value != null && item.value !== "");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id={`bean-${bean.id}`}
      className={`bc ${isExpanded ? "bc--expanded" : ""}`}
    >
      {/* Gradient left bar — visible only when expanded */}
      {isExpanded && <div className="bc__bar" aria-hidden="true" />}

      {/* ── Header row — always visible ─────────────────────────────────── */}
      <div className="bc__header">
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

        <div className="bc__info">
          <div className="bc__name">{bean.name}</div>
          {bean.url && (
            <a
              href={bean.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bc__shop-link"
              onClick={(e) => e.stopPropagation()}
            >
              View at shop →
            </a>
          )}
          <div className="bc__meta">
            {[bean.country, bean.processing, bean.shop_name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        {bean.container_name && (
          <span className="bc__badge">{bean.container_name}</span>
        )}

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
              {/* Origin / spec detail grid */}
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

              {/* Espresso recipe with Double / Single toggle */}
              {details?.recipes?.length > 0 && (
                <RecipeSection recipes={details.recipes} />
              )}

              {/* Edit / Delete actions */}
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

      {/* Delete confirmation dialog */}
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
