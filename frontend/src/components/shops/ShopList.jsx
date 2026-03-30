import { useState, useEffect } from "react";
import { useApi } from "../../api";
import Dialog from "../common/Dialog";
import EmptyState from "../common/EmptyState";
import "./ShopList.css";

// ── Single shop row ───────────────────────────────────────────────────────────
function ShopRow({ shop, onSaved, onRemoved }) {
  const api = useApi();
  const [mode, setMode] = useState("view");
  const [nameInput, setNameInput] = useState(shop.name);
  const [urlInput, setUrlInput] = useState(shop.url || "");
  const [dialog, setDialog] = useState(null);

  function handleEditClick() {
    setNameInput(shop.name);
    setUrlInput(shop.url || "");
    setMode("edit");
  }

  function hasChanges() {
    return (
      nameInput.trim() !== shop.name ||
      (urlInput.trim() || null) !== (shop.url || null)
    );
  }

  function handleCancel() {
    if (hasChanges()) {
      setDialog({ type: "discard" });
    } else {
      setMode("view");
    }
  }

  function handleDiscard() {
    setNameInput(shop.name);
    setUrlInput(shop.url || "");
    setDialog(null);
    setMode("view");
  }

  function handleKeepEditing() {
    setDialog(null);
  }

  async function handleSave() {
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;
    try {
      const updated = await api.updateShop(
        shop.id,
        trimmedName,
        urlInput.trim() || null,
      );
      setDialog(null);
      setMode("view");
      onSaved(updated);
    } catch (err) {
      if (err.status === 409) {
        setDialog({ type: "duplicate" });
      }
    }
  }

  function handleRemoveClick() {
    setDialog({ type: "remove" });
  }

  async function handleConfirmRemove() {
    try {
      await api.deleteShop(shop.id);
      setDialog(null);
      onRemoved(shop.id);
    } catch (err) {
      if (err.status === 409) {
        setDialog({ type: "blocked" });
      }
    }
  }

  return (
    <>
      <div className={`shop-row${mode === "edit" ? " shop-row--edit" : ""}`}>
        <div className="shop-icon">🏪</div>

        <div className="shop-body">
          {mode === "view" ? (
            <>
              <div className="shop-name">{shop.name}</div>
              <div className="shop-meta">
                {shop.bean_count === 0
                  ? "No beans"
                  : `${shop.bean_count} ${
                      shop.bean_count === 1 ? "bean" : "beans"
                    }`}
                {shop.url && (
                  <span>
                    {" \u00b7 "}
                    <a
                      className="shop-link"
                      href={shop.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shop.url}
                    </a>
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <input
                className="shop-input"
                placeholder="Shop name\u2026"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <input
                className="shop-input shop-input--url"
                placeholder="Website URL (optional)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
            </>
          )}
        </div>

        {mode === "view" && shop.bean_count > 0 && (
          <span className="shop-badge">{shop.bean_count}</span>
        )}

        <div className="shop-actions">
          {mode === "view" ? (
            <>
              <button
                className="shop-btn shop-btn--ghost"
                onClick={handleRemoveClick}
              >
                Remove
              </button>
              <button
                className="shop-btn shop-btn--accent"
                onClick={handleEditClick}
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                className="shop-btn shop-btn--ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="shop-btn shop-btn--accent"
                onClick={handleSave}
                disabled={!nameInput.trim()}
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {dialog?.type === "discard" && (
        <Dialog
          title="Discard changes?"
          body="You have unsaved changes to this shop."
          actions={[
            {
              label: "Keep editing",
              onClick: handleKeepEditing,
              variant: "ghost",
            },
            { label: "Discard", onClick: handleDiscard, variant: "danger" },
          ]}
        />
      )}

      {dialog?.type === "duplicate" && (
        <Dialog
          title="Name already exists"
          body={`A shop named "${nameInput.trim()}" already exists. Please choose a different name.`}
          actions={[
            { label: "OK", onClick: () => setDialog(null), variant: "accent" },
          ]}
        />
      )}

      {dialog?.type === "remove" && (
        <Dialog
          title={`Remove ${shop.name}?`}
          body={
            shop.bean_count > 0
              ? `${shop.bean_count} ${
                  shop.bean_count === 1 ? "bean references" : "beans reference"
                } this shop. You must reassign or delete those beans before removing this shop.`
              : "This shop has no beans assigned. This cannot be undone."
          }
          actions={
            shop.bean_count > 0
              ? [
                  {
                    label: "OK",
                    onClick: () => setDialog(null),
                    variant: "accent",
                  },
                ]
              : [
                  {
                    label: "Cancel",
                    onClick: () => setDialog(null),
                    variant: "ghost",
                  },
                  {
                    label: "Remove",
                    onClick: handleConfirmRemove,
                    variant: "danger",
                  },
                ]
          }
        />
      )}

      {dialog?.type === "blocked" && (
        <Dialog
          title="Cannot remove shop"
          body={`${shop.bean_count} ${
            shop.bean_count === 1 ? "bean references" : "beans reference"
          } this shop. Reassign or delete those beans first.`}
          actions={[
            { label: "OK", onClick: () => setDialog(null), variant: "accent" },
          ]}
        />
      )}
    </>
  );
}

// ── New shop row (inline add form) ────────────────────────────────────────────
function NewShopRow({ onSaved, onCancel }) {
  const api = useApi();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [dialog, setDialog] = useState(null);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const created = await api.createShop(trimmedName, url.trim() || null);
      onSaved(created);
    } catch (err) {
      if (err.status === 409) {
        setDialog({ type: "duplicate" });
      }
    }
  }

  return (
    <>
      <div className="shop-row shop-row--new">
        <div className="shop-icon">🏪</div>
        <div className="shop-body">
          <input
            className="shop-input"
            placeholder="Shop name\u2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
          <input
            className="shop-input shop-input--url"
            placeholder="Website URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>
        <div className="shop-actions">
          <button className="shop-btn shop-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="shop-btn shop-btn--accent"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>

      {dialog?.type === "duplicate" && (
        <Dialog
          title="Shop already exists"
          body={`A shop named "${name.trim()}" already exists.`}
          actions={[
            { label: "OK", onClick: () => setDialog(null), variant: "accent" },
          ]}
        />
      )}
    </>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function ShopList() {
  const api = useApi();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .getShops()
      .then(setShops)
      .finally(() => setLoading(false));
  }, [api]);

  function handleSaved(updated) {
    setShops((prev) =>
      prev
        .map((s) => (s.id === updated.id ? updated : s))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  function handleRemoved(id) {
    setShops((prev) => prev.filter((s) => s.id !== id));
  }

  function handleCreated(created) {
    setShops((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setAdding(false);
  }

  if (loading) return null;

  return (
    <div className="shop-page">
      {shops.length === 0 && !adding ? (
        <EmptyState
          icon="🏪"
          title="No shops yet"
          body="Add your first shop, or save a bean with a new shop name."
          action="+ Add Shop"
          onAction={() => setAdding(true)}
        />
      ) : (
        <>
          <div className="shop-list">
            {shops.map((s) => (
              <ShopRow
                key={s.id}
                shop={s}
                onSaved={handleSaved}
                onRemoved={handleRemoved}
              />
            ))}
            {adding && (
              <NewShopRow
                onSaved={handleCreated}
                onCancel={() => setAdding(false)}
              />
            )}
          </div>

          {!adding && (
            <div className="shop-add-wrap">
              <button className="shop-add-btn" onClick={() => setAdding(true)}>
                + Add Shop
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
