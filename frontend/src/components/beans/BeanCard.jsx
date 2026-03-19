/**
 * BeanCard.jsx — single collapsed bean card row
 * ───────────────────────────────────────────────
 * BDD scenarios covered here:
 *   CB-02  card shown collapsed in the list
 *   CB-44  favourite icon visible on collapsed card
 *
 * Props:
 *   bean       object  — v_beans row from the API
 *   onExpand   fn      — called when the expand chevron is clicked (CB-43, Phase 4)
 *   onFavClick fn      — called to toggle favourite (CB-47/48, Phase 4)
 *
 * For now we render the collapsed row only.
 * The expand/collapse logic (CB-43, CB-46) and edit/delete flows
 * will be added to this component in the next phase.
 */

import "./BeanCard.css";

export default function BeanCard({ bean, onExpand, onFavClick }) {
  // Build the sub-line below the bean name:  "Ethiopia · Natural · Buna Coffee"
  const meta = [bean.country, bean.processing, bean.shop_name]
    .filter(Boolean) // drop any null/undefined/empty values
    .join(" · ");

  return (
    <article className="bean-card" aria-label={bean.name}>
      {/* ── Left: favourite icon (CB-44) ── */}
      <button
        className={`bean-card__fav${bean.is_favourite ? " bean-card__fav--on" : ""}`}
        aria-label={
          bean.is_favourite ? "Remove from favourites" : "Add to favourites"
        }
        aria-pressed={!!bean.is_favourite}
        onClick={(e) => {
          e.stopPropagation(); // don't bubble to card click
          onFavClick?.(bean);
        }}
      >
        ♥
      </button>

      {/* ── Middle: name + meta ── */}
      <div className="bean-card__info">
        <p className="bean-card__name">{bean.name}</p>
        {meta && <p className="bean-card__meta">{meta}</p>}
      </div>

      {/* ── Right: container badge (optional) + expand chevron ── */}
      {bean.container_name && (
        <span
          className="bean-card__badge"
          aria-label={`Stored in ${bean.container_name}`}
        >
          {bean.container_name}
        </span>
      )}

      <button
        className="bean-card__chevron"
        aria-label={`Expand ${bean.name}`}
        onClick={() => onExpand?.(bean)}
      >
        ›
      </button>
    </article>
  );
}
