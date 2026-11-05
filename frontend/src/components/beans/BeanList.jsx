// frontend/src/components/beans/BeanList.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Beans tab — the home screen (Dial design).
//
//  • Header: bean count + account button
//  • Hero dial: the bean in one of your containers, showing its espresso
//    ratio (or SCA score when there is no recipe). The dial's rim has the
//    container's colour; round buttons below switch between filled
//    containers (remembered on this device). Tap the dial → bean page.
//  • Search + quick chips (All / Favourites / In containers) + Filters sheet
//    (shop, container, country — the existing BeanFilter, CB-09 – CB-24)
//  • Rows: container ring · name · shop/country/process · SCA
//      – tap  → bean page (/bean/:id)
//      – swipe left (touch) → Edit / Delete
//  • One list; favourites are sorted to the top by the API (CB-52) and
//    marked with a star. The Favourites chip shows only those.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../api";
import { fmt, getDoubleRecipe, metaLine, ratioNumber } from "../../beanUtils";
import BeanFilter from "./BeanFilter";
import Dialog from "../common/Dialog";
import EmptyState from "../common/EmptyState";
import {
  AccountButton,
  Button,
  Chip,
  Dial,
  PageHeader,
  RingBadge,
  containerColor,
} from "../ui";
import { FilterIcon, SearchIcon, StarIcon } from "../ui/icons";
import { useSwipeReveal } from "./useSwipeReveal";
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

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const HERO_KEY = "bt-hero-container";

// ── Hero dial ─────────────────────────────────────────────────────────────────
// The list endpoint has no recipes, so the hero loads its bean in full.
// `filled` = all beans that sit in a container, sorted by container number.
function HeroDial({ bean, filled, onSelect }) {
  const api = useApi();
  // Tagged with the bean id, so switching containers never shows the
  // previous bean's recipe while the new one loads
  const [loaded, setLoaded] = useState(null); // { forId, data }

  useEffect(() => {
    let cancelled = false;
    api
      .getBeanById(bean.id)
      .then((data) => !cancelled && setLoaded({ forId: bean.id, data }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, bean.id]);

  const full = loaded?.forId === bean.id ? loaded.data : null;
  const recipe = getDoubleRecipe(full);
  const ratio = recipe ? ratioNumber(recipe.dose_in_g, recipe.yield_out_g) : null;
  const rim = containerColor(bean.container_name);
  // Inside the dial just "Container 1"; the coloured rim shows which one.
  // Screen readers also get the container name.
  const label = `Container ${bean.container_id}`;
  const fullLabel = `${label}, ${bean.container_name}`;
  const labelEl = <span className="bl-hero__label">{label}</span>;
  const recipeLine = recipe
    ? metaLine(
        recipe.dose_in_g != null &&
          recipe.yield_out_g != null &&
          `${fmt(recipe.dose_in_g)} → ${fmt(recipe.yield_out_g)} g`,
        recipe.time_seconds != null && `${recipe.time_seconds} s`,
        recipe.temp_celsius != null && `${fmt(recipe.temp_celsius)}°`,
      )
    : null;

  let dial;
  if (!full) {
    // Still loading this bean's recipe
    dial = (
      <Dial value={0} min={0} max={1} size={232} rimColor={rim} ariaLabel={`${fullLabel}: loading`}>
        {labelEl}
        <span className="ui-dial__value">…</span>
      </Dial>
    );
  } else if (ratio) {
    dial = (
      <Dial
        value={ratio}
        min={1}
        max={3}
        knob
        rimColor={rim}
        size={232}
        ariaLabel={`${fullLabel}: ratio 1 to ${ratio.toFixed(1)}`}
      >
        {labelEl}
        <span className="ui-dial__value">1:{ratio.toFixed(1)}</span>
        {recipeLine && <span className="bl-hero__recipe">{recipeLine}</span>}
      </Dial>
    );
  } else if (bean.sca_score) {
    dial = (
      <Dial
        value={bean.sca_score}
        min={80}
        max={100}
        ticks={20}
        majorEvery={5}
        knob
        rimColor={rim}
        size={232}
        ariaLabel={`${fullLabel}: SCA score ${bean.sca_score}`}
      >
        {labelEl}
        <span className="ui-dial__value">{bean.sca_score}</span>
        <span className="bl-hero__recipe">SCA score · no recipe yet</span>
      </Dial>
    );
  } else {
    dial = (
      <Dial value={0} min={0} max={1} size={232} rimColor={rim} ariaLabel={`${fullLabel}: no recipe yet`}>
        {labelEl}
        <span className="ui-dial__value">–</span>
        <span className="bl-hero__recipe">No recipe yet</span>
      </Dial>
    );
  }

  return (
    <section className="bl-hero" aria-label="Bean in a container">
      <Link to={`/bean/${bean.id}`} className="bl-hero__link">
        {dial}
        <span className="bl-hero__name">{bean.name}</span>
        <span className="bl-hero__meta">
          {metaLine(bean.shop_name, bean.country, bean.processing)}
        </span>
      </Link>

      {/* Switch between filled containers */}
      {filled.length > 1 && (
        <div className="bl-hero__picker" role="radiogroup" aria-label="Container shown on the dial">
          {filled.map((b) => {
            const on = b.container_id === bean.container_id;
            return (
              <button
                key={b.container_id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Container ${b.container_id}, ${b.container_name}: ${b.name}`}
                className={`bl-hero__pick${on ? " bl-hero__pick--on" : ""}`}
                onClick={() => onSelect(b.container_id)}
              >
                <RingBadge size={36} ringColor={containerColor(b.container_name)}>
                  {b.container_id}
                </RingBadge>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── One bean row (with touch swipe → Edit / Delete) ───────────────────────────
function BeanRow({ bean, isSwipeOpen, onSwipeOpen, onSwipeClose, onEdit, onDelete }) {
  const { trackRef, offset, transitioning } = useSwipeReveal({
    enabled: true,
    isOpen: isSwipeOpen,
    onOpen: onSwipeOpen,
    onClose: onSwipeClose,
  });

  const slide = {
    transform: `translateX(-${offset}px)`,
    transition: transitioning ? "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
  };

  const inContainer = bean.container_id != null;

  return (
    <li className="bl-row" ref={trackRef}>
      {/* Revealed by swiping left. Keyboard users use the bean page instead. */}
      <div className="bl-row__actions" aria-hidden={!isSwipeOpen}>
        <button
          type="button"
          className="bl-row__action bl-row__action--edit"
          tabIndex={isSwipeOpen ? 0 : -1}
          onClick={() => {
            onSwipeClose();
            onEdit(bean);
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="bl-row__action bl-row__action--delete"
          tabIndex={isSwipeOpen ? 0 : -1}
          onClick={() => {
            onSwipeClose();
            onDelete(bean);
          }}
        >
          Delete
        </button>
      </div>

      <Link
        to={`/bean/${bean.id}`}
        className="bl-row__main"
        style={slide}
        onClick={(e) => {
          // First tap on an open row just closes it
          if (isSwipeOpen) {
            e.preventDefault();
            onSwipeClose();
          }
        }}
      >
        <RingBadge
          muted={!inContainer}
          ringColor={inContainer ? containerColor(bean.container_name) : undefined}
          title={inContainer ? `In container ${bean.container_id}, ${bean.container_name}` : undefined}
        >
          {inContainer ? bean.container_id : "–"}
        </RingBadge>
        <span className="bl-row__text">
          <span className="bl-row__name">
            {bean.name}
            {bean.is_favourite === 1 && (
              <span className="bl-row__fav" role="img" aria-label="Favourite">
                <StarIcon size={13} filled />
              </span>
            )}
          </span>
          <span className="bl-row__meta">
            {metaLine(bean.shop_name, bean.country, bean.processing)}
          </span>
        </span>
        <span className="bl-row__sca">
          {bean.sca_score != null && (
            <>
              <span className="sr-only">SCA </span>
              {bean.sca_score}
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function BeanList() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [swipeOpenId, setSwipeOpenId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Which container the hero dial shows (remembered on this device)
  const [heroContainerId, setHeroContainerId] = useState(
    () => Number(localStorage.getItem(HERO_KEY)) || null,
  );
  function selectHeroContainer(id) {
    setHeroContainerId(id);
    try {
      localStorage.setItem(HERO_KEY, String(id));
    } catch {
      /* storage unavailable — the choice just isn't remembered */
    }
  }

  // ── Filter state ──────────────────────────────────────────────────────────
  // Coming from the Shops tab with { filterShop } → start filtered to that shop
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() =>
    location.state?.filterShop
      ? { ...copyFilters(EMPTY_FILTERS), shops: [location.state.filterShop] }
      : copyFilters(EMPTY_FILTERS),
  );
  const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);

  // Clear that router state once used, so a page refresh shows all beans
  useEffect(() => {
    if (location.state?.filterShop) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadBeans = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getBeans();
      setBeans(data);
    } catch (err) {
      setError("Could not load beans. Is the backend running?");
      console.error("loadBeans:", err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadBeans();
  }, [loadBeans]);

  // ── Delete (CB-67 – CB-71) ────────────────────────────────────────────────
  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteBean(deleteTarget.id);
      setDeleteTarget(null);
      await loadBeans();
    } catch (err) {
      console.error("Could not delete bean:", err.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter panel handlers ─────────────────────────────────────────────────
  const handleFilterOpen = () => {
    setPendingFilters(copyFilters(activeFilters));
    setFilterPanelOpen(true);
  };
  const handleFilterApply = () => {
    setActiveFilters(copyFilters(pendingFilters));
    setFilterPanelOpen(false);
  };
  const clearAllFilters = () => setActiveFilters(copyFilters(EMPTY_FILTERS));

  // ── Derive available filter options from ALL beans ────────────────────────
  const availableShops = useMemo(
    () => [...new Set(beans.map((b) => b.shop_name).filter(Boolean))].sort(),
    [beans],
  );
  const availableContainers = useMemo(
    () => [...new Set(beans.map((b) => b.container_name).filter(Boolean))].sort(),
    [beans],
  );
  const hasUnassigned = useMemo(() => beans.some((b) => !b.container_name), [beans]);
  const availableCountries = useMemo(
    () => [...new Set(beans.map((b) => b.country).filter(Boolean))].sort(),
    [beans],
  );

  const activeFilterCount =
    (activeFilters.favourites ? 1 : 0) +
    (activeFilters.shops.length > 0 ? 1 : 0) +
    (activeFilters.containers.length > 0 ? 1 : 0) +
    (activeFilters.countries.length > 0 ? 1 : 0);

  // "In containers" quick chip = container filter set to every container
  const inContainersOn =
    availableContainers.length > 0 &&
    activeFilters.containers.length === availableContainers.length &&
    availableContainers.every((c) => activeFilters.containers.includes(c));

  // ── Combined filtering ────────────────────────────────────────────────────
  const filteredBeans = useMemo(() => {
    let result = beans;
    if (activeFilters.favourites) {
      result = result.filter((b) => b.is_favourite === 1);
    }
    if (activeFilters.shops.length > 0) {
      result = result.filter((b) => activeFilters.shops.includes(b.shop_name));
    }
    if (activeFilters.containers.length > 0) {
      result = result.filter((b) =>
        !b.container_name
          ? activeFilters.containers.includes("Unassigned")
          : activeFilters.containers.includes(b.container_name),
      );
    }
    if (activeFilters.countries.length > 0) {
      result = result.filter((b) => activeFilters.countries.includes(b.country));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((b) =>
        [b.name, b.country, b.region, b.variety, b.shop_name, b.processing]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [beans, searchQuery, activeFilters]);

  // Hero: the chosen container, or the lowest-numbered filled one
  const inContainers = useMemo(
    () => beans.filter((b) => b.container_id != null).sort((a, b) => a.container_id - b.container_id),
    [beans],
  );
  const heroBean =
    inContainers.find((b) => b.container_id === heroContainerId) ?? inContainers[0];
  const showHero = Boolean(heroBean) && !searchQuery.trim() && activeFilterCount === 0;
  const isFiltering = Boolean(searchQuery.trim()) || activeFilterCount > 0;

  const rowProps = (bean) => ({
    bean,
    isSwipeOpen: swipeOpenId === bean.id,
    onSwipeOpen: () => setSwipeOpenId(bean.id),
    onSwipeClose: () => setSwipeOpenId((prev) => (prev === bean.id ? null : prev)),
    onEdit: (b) => navigate(`/bean/${b.id}/edit`),
    onDelete: setDeleteTarget,
  });

  // ── Render ────────────────────────────────────────────────────────────────
  const header = (
    <PageHeader
      eyebrow={loading ? null : plural(beans.length, "bean", "beans")}
      title="Beans"
      actions={<AccountButton />}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <p className="bl-message">Loading beans…</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <p className="bl-message">{error}</p>
      </>
    );
  }

  // ── Empty state (CB-01) ───────────────────────────────────────────────────
  if (beans.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No beans yet"
          body="Add your first bag to start tracking your collection."
          action="Add a bean"
          onAction={() => navigate("/new")}
        />
      </>
    );
  }

  return (
    <div className="bl">
      {header}

      {showHero && (
        <HeroDial bean={heroBean} filled={inContainers} onSelect={selectHeroContainer} />
      )}

      {/* ── Search + filter ─────────────────────────────────────────────── */}
      <div className="bl-tools">
        <label className="bl-search">
          <SearchIcon />
          <span className="sr-only">Search beans</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, origin, shop…"
          />
        </label>
        <Button
          icon
          variant={activeFilterCount > 0 ? "primary" : "secondary"}
          className="bl-filter-btn"
          aria-label={
            activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"
          }
          onClick={handleFilterOpen}
        >
          <FilterIcon />
          {activeFilterCount > 0 && <span className="bl-filter-btn__count">{activeFilterCount}</span>}
        </Button>
      </div>

      <div className="bl-chips" role="group" aria-label="Quick filters">
        <Chip selected={activeFilterCount === 0} onClick={clearAllFilters}>
          All {beans.length}
        </Chip>
        <Chip
          selected={activeFilters.favourites}
          onClick={() => setActiveFilters((f) => ({ ...f, favourites: !f.favourites }))}
        >
          Favourites
        </Chip>
        {availableContainers.length > 0 && (
          <Chip
            selected={inContainersOn}
            onClick={() =>
              setActiveFilters((f) => ({
                ...f,
                containers: inContainersOn ? [] : [...availableContainers],
              }))
            }
          >
            In containers
          </Chip>
        )}
        {activeFilters.shops.map((s) => (
          <Chip
            key={s}
            onRemove={() =>
              setActiveFilters((f) => ({ ...f, shops: f.shops.filter((x) => x !== s) }))
            }
          >
            {s}
          </Chip>
        ))}
      </div>

      {isFiltering && (
        <p className="bl-results" role="status">
          {plural(filteredBeans.length, "result", "results")}
        </p>
      )}

      {filteredBeans.length === 0 ? (
        <div className="bl-none">
          <p>No beans match.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery("");
              clearAllFilters();
            }}
          >
            Clear search and filters
          </Button>
        </div>
      ) : (
        <ul className="bl-rows bl-list" aria-label="Beans">
          {filteredBeans.map((b) => (
            <BeanRow key={b.id} {...rowProps(b)} />
          ))}
        </ul>
      )}

      <BeanFilter
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        onApply={handleFilterApply}
        onClearAll={() => setPendingFilters(copyFilters(EMPTY_FILTERS))}
        availableShops={availableShops}
        availableContainers={availableContainers}
        hasUnassigned={hasUnassigned}
        availableCountries={availableCountries}
        pending={pendingFilters}
        onPendingChange={setPendingFilters}
      />

      {deleteTarget && (
        <Dialog
          title={`Delete ${deleteTarget.name}?`}
          body={
            deleteTarget.container_name
              ? `This permanently removes the bean and frees ${deleteTarget.container_name}. This cannot be undone.`
              : "This permanently removes the bean. This cannot be undone."
          }
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => setDeleteTarget(null) },
            {
              label: deleting ? "Deleting…" : "Delete",
              variant: "danger",
              onClick: confirmDelete,
            },
          ]}
        />
      )}
    </div>
  );
}
