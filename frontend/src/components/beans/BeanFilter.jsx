// frontend/src/components/beans/BeanFilter.jsx
//
// The filter panel — a bottom sheet that slides up from the bottom.
// This component is "controlled": it owns NO state itself.
// BeanList owns activeFilters and pendingFilters and passes them down.
//
// Props:
//   isOpen             bool    — whether the panel is visible
//   onClose            fn      — dismiss WITHOUT applying (CB-24)
//   onApply            fn      — apply pendingFilters → activeFilters
//   onClearAll         fn      — reset pendingFilters to empty (CB-22)
//   availableShops     string[] — derived from all beans in BeanList
//   availableContainers string[]
//   hasUnassigned      bool    — true if any bean has no container
//   availableCountries string[]
//   pending            object  — { favourites, shops, containers, countries }
//   onPendingChange    fn      — called with the new pending object on every change

import "./BeanFilter.css";

// ─────────────────────────────────────────────────────────────────────────────
//  FilterSection — one collapsible group of checkboxes (Shop, Container, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";

function FilterSection({ title, options, selected, onToggle, emptyMessage }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bf-section">
      {/* Section header — click to collapse/expand */}
      <button
        className="bf-section__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="bf-section__title">{title}</span>
        {/* Show how many options are selected in this section */}
        {selected.length > 0 && (
          <span className="bf-section__count">{selected.length}</span>
        )}
        <span
          className={`bf-section__chevron ${open ? "bf-section__chevron--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {open && (
        <div className="bf-section__body">
          {options.length === 0 ? (
            <span className="bf-section__empty">{emptyMessage}</span>
          ) : (
            options.map((option) => {
              const checked = selected.includes(option);
              return (
                // Using a <label> wrapping a hidden real checkbox gives us
                // accessible keyboard behaviour for free (CB-21: click to deselect)
                <label
                  key={option}
                  className={`bf-option ${checked ? "bf-option--checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="bf-option__input"
                    checked={checked}
                    onChange={() => onToggle(option)}
                  />
                  {/* Custom checkbox box */}
                  <span className="bf-option__box" aria-hidden="true">
                    {checked && <span className="bf-option__tick">✓</span>}
                  </span>
                  <span className="bf-option__label">{option}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main BeanFilter component
// ─────────────────────────────────────────────────────────────────────────────
export default function BeanFilter({
  isOpen,
  onClose,
  onApply,
  onClearAll,
  availableShops,
  availableContainers,
  hasUnassigned,
  availableCountries,
  pending,
  onPendingChange,
}) {
  // Don't render anything when closed — keeps the DOM clean
  if (!isOpen) return null;

  const { favourites, shops, containers, countries } = pending;

  // Toggle a value inside one of the array-based filter keys (CB-21)
  const toggle = (key, value) => {
    const current = pending[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value) // deselect
      : [...current, value]; // select
    onPendingChange({ ...pending, [key]: next });
  };

  // Total pending selections — drives the Apply button label
  const pendingCount =
    (favourites ? 1 : 0) + shops.length + containers.length + countries.length;

  return (
    <>
      {/* ── Backdrop — click to dismiss without applying (CB-24) ─────── */}
      <div className="bf-backdrop" onClick={onClose} aria-hidden="true" />

      {/* ── Panel ────────────────────────────────────────────────────── */}
      <div
        className="bf-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Filter beans"
      >
        {/* Drag handle (decorative, common mobile pattern) */}
        <div className="bf-panel__handle" aria-hidden="true" />

        {/* Header */}
        <div className="bf-panel__header">
          <span className="bf-panel__title">Filters</span>
          {pendingCount > 0 && (
            <span className="bf-panel__pending-count">
              {pendingCount} selected
            </span>
          )}
          <button
            className="bf-panel__close"
            onClick={onClose}
            aria-label="Close filters without applying"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="bf-panel__body">
          {/* ── Favourites — single toggle (CB-09, CB-13) ────────────── */}
          <label
            className={`bf-option bf-option--featured ${favourites ? "bf-option--checked" : ""}`}
          >
            <input
              type="checkbox"
              className="bf-option__input"
              checked={favourites}
              onChange={() =>
                onPendingChange({ ...pending, favourites: !favourites })
              }
            />
            <span className="bf-option__box" aria-hidden="true">
              {favourites && <span className="bf-option__tick">✓</span>}
            </span>
            <span className="bf-option__label">Favourites only</span>
            <span className="bf-option__fav" aria-hidden="true">
              ♥
            </span>
          </label>

          <div className="bf-divider" />

          {/* ── Shop filter (CB-10, CB-15) ────────────────────────────── */}
          <FilterSection
            title="Shop"
            options={availableShops}
            selected={shops}
            onToggle={(v) => toggle("shops", v)}
            emptyMessage="No shops in database"
          />

          <div className="bf-divider" />

          {/* ── Container filter (CB-11, CB-16, CB-17) ───────────────── */}
          <FilterSection
            title="Container"
            options={[
              ...(hasUnassigned ? ["Unassigned"] : []),
              ...availableContainers,
            ]}
            selected={containers}
            onToggle={(v) => toggle("containers", v)}
            emptyMessage="No containers in database"
          />

          <div className="bf-divider" />

          {/* ── Country of origin filter (CB-12, CB-18) ──────────────── */}
          <FilterSection
            title="Country of origin"
            options={availableCountries}
            selected={countries}
            onToggle={(v) => toggle("countries", v)}
            emptyMessage="No countries in database"
          />
        </div>

        {/* Footer */}
        <div className="bf-panel__footer">
          <button
            className="bf-panel__clear"
            onClick={onClearAll}
            disabled={pendingCount === 0}
          >
            Clear filters
          </button>
          <button className="bf-panel__apply" onClick={onApply}>
            {pendingCount > 0 ? `Apply · ${pendingCount}` : "Apply"}
          </button>
        </div>
      </div>
    </>
  );
}
