// components/shops/ShopList.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shops tab (SH-01 – SH-08, plus edit and remove).
//
//  • Header: shop and bean totals, "New" button, account button
//  • Sort: Most beans | A–Z (remembered on this device)
//  • Each row: initial ring · name · website · bean count · ⋯
//      – tap the row  → bean list filtered to this shop
//      – ↗ icon       → opens the shop's website in a new tab
//      – ⋯            → edit sheet (name, website, remove)
//  • A shop can only be removed when no beans use it (the database blocks it
//    too — ON DELETE RESTRICT), so Remove is disabled with an explanation.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../api";
import { externalUrl, hostname } from "../../beanUtils";
import Dialog from "../common/Dialog";
import EmptyState from "../common/EmptyState";
import {
  AccountButton,
  Button,
  Field,
  PageHeader,
  RingBadge,
  Segmented,
  Sheet,
} from "../ui";
import { ExternalIcon, MoreIcon, PlusIcon } from "../ui/icons";
import "./ShopList.css";

const SORT_KEY = "bt-shop-sort";
const SORTS = [
  { value: "count", label: "Most beans" },
  { value: "az", label: "A–Z" },
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ── Edit / new shop sheet ─────────────────────────────────────────────────────
// shop = null → create a new shop
function ShopEditor({ shop, open, onClose, onSaved, onRemoved }) {
  const api = useApi();
  const isNew = !shop;
  const [name, setName] = useState(shop?.name ?? "");
  const [url, setUrl] = useState(shop?.url ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const inUse = (shop?.bean_count ?? 0) > 0;

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const saved = isNew
        ? await api.createShop(trimmed, url.trim() || null)
        : await api.updateShop(shop.id, trimmed, url.trim() || null);
      onSaved(saved);
    } catch (err) {
      if (err.status === 409) {
        setError(`A shop named “${trimmed}” already exists.`);
      } else {
        setError("Could not save. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    try {
      await api.deleteShop(shop.id);
      setConfirmRemove(false);
      onRemoved(shop.id);
    } catch (err) {
      setConfirmRemove(false);
      setError(
        err.status === 409
          ? "This shop still has beans. Move or delete them first."
          : "Could not remove the shop.",
      );
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={isNew ? "New shop" : `Edit ${shop.name}`}>
        <form className="shop-editor" onSubmit={handleSave}>
          <Field
            label="Shop name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            error={error}
            autoFocus
            required
          />
          <Field
            label="Website"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            hint="Optional — the shop's home page"
          />
          <div className="shop-editor__actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {!isNew && (
            <div className="shop-editor__remove">
              <Button
                variant="danger"
                block
                disabled={inUse}
                onClick={() => setConfirmRemove(true)}
              >
                Remove shop
              </Button>
              {inUse && (
                <p className="shop-editor__note">
                  {plural(shop.bean_count, "bean uses", "beans use")} this shop.
                  Move or delete {shop.bean_count === 1 ? "it" : "them"} before
                  removing the shop.
                </p>
              )}
            </div>
          )}
        </form>
      </Sheet>

      {confirmRemove && (
        <Dialog
          title={`Remove ${shop.name}?`}
          body="This shop has no beans. Removing it cannot be undone."
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => setConfirmRemove(false) },
            { label: "Remove", variant: "danger", onClick: handleRemove },
          ]}
        />
      )}
    </>
  );
}

// ── One row ───────────────────────────────────────────────────────────────────
function ShopRow({ shop, onEdit }) {
  const empty = shop.bean_count === 0;
  const site = hostname(shop.url);

  return (
    <li className={`shop-row${empty ? " shop-row--empty" : ""}`}>
      <Link
        to="/"
        state={{ filterShop: shop.name }}
        className="shop-row__main"
        aria-label={`${shop.name}, ${plural(shop.bean_count, "bean", "beans")}. Show beans`}
      >
        <RingBadge muted={empty}>{shop.name.replace(/^the\s+/i, "").charAt(0).toUpperCase()}</RingBadge>
        <span className="shop-row__text">
          <span className="shop-row__name">{shop.name}</span>
          <span className="shop-row__site">{site || (empty ? "No beans yet" : "")}</span>
        </span>
        <span className="shop-row__count" aria-hidden="true">
          {shop.bean_count}
        </span>
      </Link>

      {shop.url && (
        <a
          className="ui-btn ui-btn--icon ui-btn--quiet"
          href={externalUrl(shop.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${shop.name} website (new tab)`}
        >
          <ExternalIcon />
        </a>
      )}
      <Button
        icon
        variant="quiet"
        aria-label={`Edit ${shop.name}`}
        onClick={() => onEdit(shop)}
      >
        <MoreIcon />
      </Button>
    </li>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function ShopList() {
  const api = useApi();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sort, setSort] = useState(() => localStorage.getItem(SORT_KEY) || "count");
  // editing: undefined = sheet closed, null = new shop, object = edit that shop
  const [editing, setEditing] = useState(undefined);

  useEffect(() => {
    api
      .getShops()
      .then(setShops)
      .catch(() => setLoadError("Could not load shops. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [api]);

  function changeSort(value) {
    setSort(value);
    try {
      localStorage.setItem(SORT_KEY, value);
    } catch {
      /* storage unavailable — sorting still works for this visit */
    }
  }

  const sorted = useMemo(() => {
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    const list = [...shops];
    return sort === "count"
      ? list.sort((a, b) => b.bean_count - a.bean_count || byName(a, b))
      : list.sort(byName);
  }, [shops, sort]);

  const totalBeans = shops.reduce((sum, s) => sum + (s.bean_count || 0), 0);

  function handleSaved(saved) {
    setShops((prev) =>
      prev.some((s) => s.id === saved.id)
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [...prev, saved],
    );
    setEditing(undefined);
  }

  function handleRemoved(id) {
    setShops((prev) => prev.filter((s) => s.id !== id));
    setEditing(undefined);
  }

  return (
    <div className="shop-page">
      <PageHeader
        eyebrow={
          loading ? null : `${plural(shops.length, "shop", "shops")} · ${plural(totalBeans, "bean", "beans")}`
        }
        title="Shops"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              <PlusIcon /> New
            </Button>
            <AccountButton />
          </>
        }
      />

      {loading ? (
        <p className="shop-page__message">Loading shops…</p>
      ) : loadError ? (
        <p className="shop-page__message">{loadError}</p>
      ) : shops.length === 0 ? (
        <EmptyState
          title="No shops yet"
          body="Add your first shop, or save a bean with a new shop name."
          action="Add shop"
          onAction={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="shop-page__sort">
            <Segmented ariaLabel="Sort shops" value={sort} onChange={changeSort} options={SORTS} />
          </div>
          <ul className="shop-list">
            {sorted.map((s) => (
              <ShopRow key={s.id} shop={s} onEdit={setEditing} />
            ))}
          </ul>
        </>
      )}

      {editing !== undefined && (
        <ShopEditor
          // key: fresh form state for every shop opened
          key={editing?.id ?? "new"}
          shop={editing}
          open
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  );
}
