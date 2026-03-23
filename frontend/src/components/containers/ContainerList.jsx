import { useState, useEffect } from "react";
import {
  getContainers,
  createContainer,
  updateContainer,
  deleteContainer,
} from "../../api";
import Dialog from "../common/Dialog";
import EmptyState from "../common/EmptyState";
import "./ContainerList.css";

// ── Single editable row ───────────────────────────────────────────────────────
function ContainerRow({ container, onSaved, onRemoved }) {
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [nameInput, setNameInput] = useState(container.name);
  const [originalName] = useState(container.name);

  // Dialog state — one dialog covers duplicate warning + discard warning + remove confirm
  const [dialog, setDialog] = useState(null);
  // { type: "duplicate" | "discard" | "remove" }

  function handleEditClick() {
    setNameInput(container.name);
    setMode("edit");
  }

  // CON-10: cancel with no changes → go straight back to view
  // CON-11: cancel with changes → show discard warning
  function handleCancel() {
    if (nameInput.trim() === container.name) {
      setMode("view");
    } else {
      setDialog({ type: "discard" });
    }
  }

  // CON-12: discard confirmed
  function handleDiscard() {
    setNameInput(container.name);
    setDialog(null);
    setMode("view");
  }

  // CON-13: keep editing
  function handleKeepEditing() {
    setDialog(null);
  }

  // CON-14 / CON-16: save
  async function handleSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    try {
      const updated = await updateContainer(container.id, trimmed);
      setDialog(null);
      setMode("view");
      onSaved(updated);
    } catch (err) {
      // 409 = duplicate name (CON-14)
      if (err.status === 409) {
        setDialog({ type: "duplicate" });
      }
    }
  }

  // CON-17 / CON-18: open remove confirmation
  function handleRemoveClick() {
    setDialog({ type: "remove" });
  }

  // CON-19: cancel remove
  function handleCancelRemove() {
    setDialog(null);
  }

  // CON-20 / CON-21: confirm remove
  async function handleConfirmRemove() {
    await deleteContainer(container.id);
    setDialog(null);
    onRemoved(container.id);
  }

  // Disable save if name is empty or only whitespace
  const saveDisabled = !nameInput.trim();

  return (
    <>
      <div className={`ctr-row${mode === "edit" ? " ctr-row--edit" : ""}`}>
        {/* Number badge */}
        <div className="ctr-num">{container.id}</div>

        <div className="ctr-body">
          {mode === "view" ? (
            <>
              <div className="ctr-name">{container.name}</div>
              {container.bean_name ? (
                <div className="ctr-bean">{container.bean_name}</div>
              ) : (
                <div className="ctr-bean ctr-bean--empty">Empty</div>
              )}
            </>
          ) : (
            <input
              className="ctr-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          )}
        </div>

        {container.bean_name && mode === "view" && (
          <span className="ctr-badge">In use</span>
        )}

        <div className="ctr-actions">
          {mode === "view" ? (
            <>
              <button
                className="ctr-btn ctr-btn--ghost"
                onClick={handleRemoveClick}
              >
                Remove
              </button>
              <button
                className="ctr-btn ctr-btn--accent"
                onClick={handleEditClick}
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button className="ctr-btn ctr-btn--ghost" onClick={handleCancel}>
                Cancel
              </button>
              <button
                className="ctr-btn ctr-btn--accent"
                onClick={handleSave}
                disabled={!nameInput.trim()}
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* CON-11 discard warning */}
      {dialog?.type === "discard" && (
        <Dialog
          title="Discard changes?"
          body="You have unsaved changes to this container name."
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

      {/* CON-14 duplicate name warning */}
      {dialog?.type === "duplicate" && (
        <Dialog
          title="Name already exists"
          body={`A container named "${nameInput.trim()}" already exists. Please choose a different name.`}
          actions={[
            { label: "OK", onClick: () => setDialog(null), variant: "accent" },
          ]}
        />
      )}

      {/* CON-17 / CON-18 remove confirmation */}
      {dialog?.type === "remove" && (
        <Dialog
          title={`Remove ${container.name}?`}
          body={
            container.bean_name
              ? `${container.bean_name} is currently assigned to this container and will be unassigned. This cannot be undone.`
              : "This cannot be undone."
          }
          actions={[
            { label: "Cancel", onClick: handleCancelRemove, variant: "ghost" },
            {
              label: "Remove",
              onClick: handleConfirmRemove,
              variant: "danger",
            },
          ]}
        />
      )}
    </>
  );
}

// ── New container row (inline add form) ───────────────────────────────────────
function NewContainerRow({ onSaved, onCancel }) {
  const [name, setName] = useState("");
  const [dialog, setDialog] = useState(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createContainer(trimmed);
      onSaved(created);
    } catch (err) {
      if (err.status === 409) {
        setDialog({ type: "duplicate" });
      }
    }
  }

  return (
    <>
      <div className="ctr-row ctr-row--new">
        <div className="ctr-num ctr-num--new">+</div>
        <div className="ctr-body">
          <input
            className="ctr-input"
            placeholder="Container name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>
        <div className="ctr-actions">
          <button className="ctr-btn ctr-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="ctr-btn ctr-btn--accent"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>

      {dialog?.type === "duplicate" && (
        <Dialog
          title="Name already exists"
          body={`A container named "${name.trim()}" already exists.`}
          actions={[
            { label: "OK", onClick: () => setDialog(null), variant: "accent" },
          ]}
        />
      )}
    </>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function ContainerList() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getContainers()
      .then(setContainers)
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated) {
    setContainers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  function handleRemoved(id) {
    setContainers((prev) => prev.filter((c) => c.id !== id));
  }

  function handleCreated(created) {
    setContainers((prev) => [...prev, created]);
    setAdding(false);
  }

  if (loading) return null;

  return (
    <div className="ctr-page">
      {containers.length === 0 && !adding ? (
        <EmptyState
          icon="📦"
          title="No containers yet"
          body="Add your first container to start assigning coffee beans."
          action="+ Add Container"
          onAction={() => setAdding(true)}
        />
      ) : (
        <>
          <div className="ctr-list">
            {containers.map((c) => (
              <ContainerRow
                key={c.id}
                container={c}
                onSaved={handleSaved}
                onRemoved={handleRemoved}
              />
            ))}
            {adding && (
              <NewContainerRow
                onSaved={handleCreated}
                onCancel={() => setAdding(false)}
              />
            )}
          </div>

          {!adding && (
            <div className="ctr-add-wrap">
              <button className="ctr-add-btn" onClick={() => setAdding(true)}>
                + Add Container
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
