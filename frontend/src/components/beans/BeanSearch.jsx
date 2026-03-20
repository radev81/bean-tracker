// frontend/src/components/beans/BeanSearch.jsx
//
// Renders the search bar row (CB-03).
// This is a controlled, "dumb" component — it holds no state of its own.
// The parent (BeanList) owns the query string and passes it down via props.
//
// Props:
//   query         string   — current search string (controlled)
//   onChange      fn       — called with the new string on every keystroke
//   onClear       fn       — called when the × button is clicked
//   resultCount   number   — shown as "X results" when query is non-empty
//   totalCount    number   — total beans (used to hide count when showing all)
//   onFilterClick fn       — called when the Filter button is clicked
//                            (wired up properly in the next phase)
//   filterActive  bool     — true when ≥1 filter is applied (shows a dot)

import "./BeanSearch.css";

export default function BeanSearch({
  query,
  onChange,
  onClear,
  resultCount,
  totalCount,
  onFilterClick,
  filterActive = false,
}) {
  const hasQuery = query.length > 0;

  return (
    <div className="bs">
      {/* ── Search input row ─────────────────────────────────────────── */}
      <div className={`bs__bar ${hasQuery ? "bs__bar--active" : ""}`}>
        {/* Search icon */}
        <span className="bs__icon" aria-hidden="true">
          ⌕
        </span>

        {/* The actual input — CB-04 */}
        <input
          className="bs__input"
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search beans, origin, shop…"
          aria-label="Search beans"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Result count — shown only while a query is active (CB-04) */}
        {hasQuery && (
          <span className="bs__count">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Clear button (×) — shown only while a query is active (CB-06) */}
        {hasQuery && (
          <button
            className="bs__clear"
            onClick={onClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}

        {/* Filter button — always visible (CB-03).
            The dot indicator appears when filters are active.
            onClick will be wired up properly in the filters phase. */}
        <button
          className={`bs__filter ${filterActive ? "bs__filter--active" : ""}`}
          onClick={onFilterClick}
          aria-label="Filter beans"
        >
          Filter
          {filterActive && (
            <span className="bs__filter-dot" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
