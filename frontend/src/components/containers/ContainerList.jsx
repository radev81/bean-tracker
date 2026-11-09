// components/containers/ContainerList.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Containers tab (CON-01 – CON-21) in the Dial design.
//
//  • Each container is a round card: its number (= id, the same number used
//    in the QR code link) inside a ring coloured from its name.
//  • Filled container → tap opens the bean.  Empty → tap opens "Fill".
//  • ⋯ on a card → manage sheet: rename, change/empty bean, copy QR link,
//    remove.
//  • "New" in the header adds a container.
//
// Filling or emptying a container updates the BEAN (its container_id) via
// PUT /api/beans/:id — the backend has no separate "assign" endpoint, so we
// load the full bean first and send it back with only container_id changed.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../api";
import { beanToPayload, metaLine } from "../../beanUtils";
import Dialog from "../common/Dialog";
import EmptyState from "../common/EmptyState";
import {
  AccountButton,
  Button,
  Field,
  PageHeader,
  RingBadge,
  Sheet,
  containerColor,
} from "../ui";
import { CopyIcon, MoreIcon, PlusIcon, SearchIcon } from "../ui/icons";
import "./ContainerList.css";

const qrLink = (id) => `${window.location.origin}${import.meta.env.BASE_URL}container/${id}`;

// ── New / rename sheet ────────────────────────────────────────────────────────
function NameSheet({ container, onClose, onSaved }) {
  const api = useApi();
  const isNew = !container;
  const [name, setName] = useState(container?.name ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // CON-11: renaming and then cancelling asks before throwing the change away
  const changed = !isNew && name !== container.name;
  const handleClose = () => (changed ? setConfirmDiscard(true) : onClose());

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const saved = isNew
        ? await api.createContainer(trimmed)
        : await api.updateContainer(container.id, trimmed);
      onSaved(saved);
    } catch (err) {
      setError(
        err.status === 409
          ? `A container named “${trimmed}” already exists.`
          : "Could not save. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Sheet open onClose={handleClose} title={isNew ? "New container" : `Rename ${container.name}`}>
        <form className="ctr-form" onSubmit={handleSave}>
          <Field
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            error={error}
            hint="Tip: a colour word (Grey, Green, Azul…) colours its ring"
            autoFocus
            required
          />
          <div className="ctr-form__actions">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* CON-11 – CON-13 */}
      {confirmDiscard && (
        <Dialog
          title="Discard changes?"
          body={`The new name for ${container.name} hasn't been saved.`}
          actions={[
            { label: "Keep editing", variant: "secondary", onClick: () => setConfirmDiscard(false) },
            { label: "Discard", variant: "danger", onClick: onClose },
          ]}
        />
      )}
    </>
  );
}

// ── Fill / change-bean sheet ──────────────────────────────────────────────────
function FillSheet({ container, onClose, onDone }) {
  const api = useApi();
  const [beans, setBeans] = useState(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getBeans()
      .then(setBeans)
      .catch(() => setError("Could not load beans."));
  }, [api]);

  // Beans not already in THIS container; unassigned ones first
  const options = useMemo(() => {
    if (!beans) return [];
    const q = query.trim().toLowerCase();
    return beans
      .filter((b) => b.container_id !== container.id)
      .filter((b) =>
        !q ? true : metaLine(b.name, b.shop_name, b.country).toLowerCase().includes(q),
      )
      .sort((a, b) => (a.container_id ? 1 : 0) - (b.container_id ? 1 : 0));
  }, [beans, query, container.id]);

  async function choose(bean) {
    setBusyId(bean.id);
    setError(null);
    try {
      const full = await api.getBeanById(bean.id);
      await api.updateBean(
        bean.id,
        // replaceContainer: the user explicitly picked this container, so an
        // existing occupant is moved out (it stays in the bean list)
        beanToPayload(full, { container_id: container.id, replaceContainer: true }),
      );
      onDone();
    } catch {
      setError("Could not update the container. Try again.");
      setBusyId(null);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${container.bean_name ? "Change bean in" : "Fill"} ${container.name}`}
    >
      <label className="ctr-search">
        <SearchIcon />
        <span className="sr-only">Search beans</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your beans"
        />
      </label>

      {error && <p className="ctr-sheet-error">{error}</p>}
      {!beans && !error && <p className="ctr-sheet-msg">Loading beans…</p>}
      {beans && options.length === 0 && (
        <p className="ctr-sheet-msg">No matching beans.</p>
      )}

      <ul className="ctr-pick">
        {options.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              className="ctr-pick__row"
              onClick={() => choose(b)}
              disabled={busyId !== null}
            >
              <span className="ctr-pick__text">
                <span className="ctr-pick__name">{b.name}</span>
                <span className="ctr-pick__meta">
                  {metaLine(
                    b.shop_name,
                    b.country,
                    b.container_name && `now in ${b.container_name}`,
                  )}
                </span>
              </span>
              <span className="ctr-pick__sca">{busyId === b.id ? "…" : (b.sca_score ?? "")}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

// ── Manage sheet (⋯) ──────────────────────────────────────────────────────────
function ManageSheet({ container, onClose, onRename, onFill, onEmptied, onRemoved }) {
  const api = useApi();
  const [confirm, setConfirm] = useState(null); // "empty" | "remove"
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qrLink(container.id));
      setCopied(true);
    } catch {
      setError(`Copy failed. The link is ${qrLink(container.id)}`);
    }
  }

  async function emptyContainer() {
    try {
      const full = await api.getBeanById(container.bean_id);
      await api.updateBean(full.id, beanToPayload(full, { container_id: null }));
      setConfirm(null);
      onEmptied();
    } catch {
      setConfirm(null);
      setError("Could not empty the container. Try again.");
    }
  }

  async function removeContainer() {
    try {
      await api.deleteContainer(container.id);
      setConfirm(null);
      onRemoved(container.id);
    } catch {
      setConfirm(null);
      setError("Could not remove the container. Try again.");
    }
  }

  return (
    <>
      <Sheet open onClose={onClose} title={`${container.id} · ${container.name}`}>
        <div className="ctr-manage">
          <p className="ctr-manage__status">
            {container.bean_name ? `Holds ${container.bean_name}` : "Empty"}
          </p>
          <Button variant="secondary" block onClick={onFill}>
            {container.bean_name ? "Change bean" : "Fill with a bean"}
          </Button>
          {container.bean_name && (
            <Button variant="secondary" block onClick={() => setConfirm("empty")}>
              Empty container
            </Button>
          )}
          <Button variant="secondary" block onClick={onRename}>
            Rename
          </Button>
          <Button variant="secondary" block onClick={copyLink}>
            <CopyIcon /> {copied ? "QR link copied" : "Copy QR code link"}
          </Button>
          {error && <p className="ctr-sheet-error">{error}</p>}
          <Button variant="danger" block onClick={() => setConfirm("remove")}>
            Remove container
          </Button>
        </div>
      </Sheet>

      {confirm === "empty" && (
        <Dialog
          title={`Empty ${container.name}?`}
          body={`${container.bean_name} stays in your bean list, just without a container.`}
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => setConfirm(null) },
            { label: "Empty", variant: "primary", onClick: emptyContainer },
          ]}
        />
      )}

      {/* CON-17 / CON-18 */}
      {confirm === "remove" && (
        <Dialog
          title={`Remove ${container.name}?`}
          body={
            container.bean_name
              ? `${container.bean_name} is in this container and will be unassigned. This cannot be undone.`
              : "This cannot be undone."
          }
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => setConfirm(null) },
            { label: "Remove", variant: "danger", onClick: removeContainer },
          ]}
        />
      )}
    </>
  );
}

// ── One container card ────────────────────────────────────────────────────────
function ContainerCard({ container, onFill, onManage }) {
  const filled = Boolean(container.bean_id);
  const ring = containerColor(container.name);

  const inner = (
    <>
      <RingBadge size={112} ringColor={ring} muted={false}>
        {container.id}
      </RingBadge>
      <span className="ctr-card__label">
        <span className="ctr-card__dot" style={{ background: ring }} aria-hidden="true" />
        {container.name}
      </span>
      <span className={`ctr-card__bean${filled ? "" : " ctr-card__bean--empty"}`}>
        {filled ? container.bean_name : "Empty · tap to fill"}
      </span>
    </>
  );

  return (
    <li className={`ctr-card${filled ? "" : " ctr-card--empty"}`}>
      {filled ? (
        <Link
          to={`/bean/${container.bean_id}`}
          className="ctr-card__main"
          aria-label={`Container ${container.id}, ${container.name}: ${container.bean_name}. Open bean`}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          className="ctr-card__main"
          onClick={() => onFill(container)}
          aria-label={`Container ${container.id}, ${container.name}: empty. Fill it`}
        >
          {inner}
        </button>
      )}
      <Button
        icon
        variant="quiet"
        className="ctr-card__more"
        aria-label={`Manage container ${container.id}, ${container.name}`}
        onClick={() => onManage(container)}
      >
        <MoreIcon />
      </Button>
    </li>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContainerList() {
  const api = useApi();
  const location = useLocation();
  const navigate = useNavigate();
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // sheet: { type: "new" } | { type: "rename" | "fill" | "manage", container }
  const [sheet, setSheet] = useState(null);

  // Arriving from an empty QR page with { fillId } → open the fill sheet for
  // that container as soon as the list has loaded.
  const pendingFillRef = useRef(location.state?.fillId ?? null);

  const load = useCallback(
    () =>
      api
        .getContainers()
        .then((list) => {
          const sorted = [...list].sort((a, b) => a.id - b.id);
          setContainers(sorted);
          setLoadError(null);
          if (pendingFillRef.current) {
            const c = sorted.find((x) => x.id === Number(pendingFillRef.current));
            pendingFillRef.current = null;
            navigate(location.pathname, { replace: true, state: null });
            if (c) setSheet({ type: "fill", container: c });
          }
        })
        .catch(() => setLoadError("Could not load containers. Is the backend running?"))
        .finally(() => setLoading(false)),
    [api, navigate, location.pathname],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filledCount = containers.filter((c) => c.bean_id).length;
  const close = () => setSheet(null);
  const reloadAndClose = () => {
    setSheet(null);
    load();
  };

  return (
    <div className="ctr-page">
      <PageHeader
        eyebrow={
          loading
            ? null
            : `${containers.length} ${containers.length === 1 ? "container" : "containers"} · ${filledCount} filled`
        }
        title="Containers"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSheet({ type: "new" })}>
              <PlusIcon /> New
            </Button>
            <AccountButton />
          </>
        }
      />

      {loading ? (
        <p className="ctr-page__message">Loading containers…</p>
      ) : loadError ? (
        <p className="ctr-page__message">{loadError}</p>
      ) : containers.length === 0 ? (
        <EmptyState
          title="No containers yet"
          body="Add the jars or canisters you keep beans in. Each gets a number for its QR code."
          action="Add container"
          onAction={() => setSheet({ type: "new" })}
        />
      ) : (
        <ul className="ctr-grid">
          {containers.map((c) => (
            <ContainerCard
              key={c.id}
              container={c}
              onFill={(container) => setSheet({ type: "fill", container })}
              onManage={(container) => setSheet({ type: "manage", container })}
            />
          ))}
        </ul>
      )}

      {sheet?.type === "new" && <NameSheet onClose={close} onSaved={reloadAndClose} />}
      {sheet?.type === "rename" && (
        <NameSheet container={sheet.container} onClose={close} onSaved={reloadAndClose} />
      )}
      {sheet?.type === "fill" && (
        <FillSheet container={sheet.container} onClose={close} onDone={reloadAndClose} />
      )}
      {sheet?.type === "manage" && (
        <ManageSheet
          container={sheet.container}
          onClose={close}
          onRename={() => setSheet({ type: "rename", container: sheet.container })}
          onFill={() => setSheet({ type: "fill", container: sheet.container })}
          onEmptied={reloadAndClose}
          onRemoved={reloadAndClose}
        />
      )}
    </div>
  );
}
