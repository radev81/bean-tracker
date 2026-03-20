// frontend/src/components/beans/BeanSearch.jsx

import "./BeanSearch.css";

export default function BeanSearch({
  query,
  onChange,
  onClear,
  resultCount,
  onFilterClick,
  onClearFilters, // CB-23: clear active filters from the list
  activeFilterCount, // number — how many filter types are currently active
}) {
  const hasQuery = query.length > 0;
  const filtersActive = activeFilterCount > 0;

  return (
    <div className="bs">
      <div className={`bs__bar ${hasQuery ? "bs__bar--active" : ""}`}>
        {/* Search icon */}
        <span className="bs__icon" aria-hidden="true">
          ⌕
        </span>

        {/* Input */}
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

        {/* Result count — only while typing */}
        {hasQuery && (
          <span className="bs__count">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Clear search × */}
        {hasQuery && (
          <button
            className="bs__clear"
            onClick={onClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}

        {/* ── Filter button area ────────────────────────────────────── */}
        {/* When no filters are active: single button that opens the panel.
            When filters ARE active: the count badge acts as the open trigger,
            and a separate × clears all filters without opening the panel (CB-23). */}
        <div className="bs__filter-wrap">
          <button
            className={`bs__filter ${filtersActive ? "bs__filter--active" : ""}`}
            onClick={onFilterClick}
            aria-label={
              filtersActive
                ? `Filters active (${activeFilterCount})`
                : "Open filters"
            }
          >
            Filter
            {filtersActive && (
              <span className="bs__filter-badge" aria-hidden="true">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Separate × to clear all filters without opening panel (CB-23) */}
          {filtersActive && (
            <button
              className="bs__filter-clear"
              onClick={onClearFilters}
              aria-label="Clear all filters"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
