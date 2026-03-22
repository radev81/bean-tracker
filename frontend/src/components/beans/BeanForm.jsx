// frontend/src/components/beans/BeanForm.jsx

import { useState, useEffect, useRef } from "react";
import { apiFetch, updateBean } from "../../api";
import Dialog from "../common/Dialog";
import "./BeanForm.css";

// ── Small helper — did the user change anything? ──────────────────────────────
// Compares current field values against the original bean so we know whether
// to show the "Discard changes?" warning on cancel (CB-56).
function hasChanges(bean, fields) {
  if (!bean) return false; // add mode — no original to compare against
  return (
    fields.name !== (bean.name ?? "") ||
    fields.shopInput !== (bean.shop_name ?? "") ||
    fields.country !== (bean.country ?? "") ||
    fields.region !== (bean.region ?? "") ||
    fields.altitude !== (bean.altitude ?? "") ||
    fields.variety !== (bean.variety ?? "") ||
    fields.processing !== (bean.processing ?? "") ||
    fields.scaScore !==
      (bean.sca_score != null ? String(bean.sca_score) : "") ||
    fields.farmProducer !== (bean.farm_producer ?? "") ||
    fields.url !== (bean.url ?? "") ||
    fields.notes !== (bean.notes ?? "") ||
    fields.containerId !==
      (bean.container_id != null ? String(bean.container_id) : "") ||
    fields.tagsInput !== (bean.tags?.join(", ") ?? "")
  );
}

export default function BeanForm({
  bean = null,
  onClose,
  onSaved,
  onViewExisting,
}) {
  // ── When bean is provided we're in edit mode ───────────────────────────────
  const isEditing = bean !== null;

  // ── Required fields — pre-fill from bean if editing ───────────────────────
  const [name, setName] = useState(bean?.name ?? "");
  const [shopInput, setShopInput] = useState(bean?.shop_name ?? "");
  const [country, setCountry] = useState(bean?.country ?? "");

  // ── Optional fields ───────────────────────────────────────────────────────
  const [region, setRegion] = useState(bean?.region ?? "");
  const [altitude, setAltitude] = useState(bean?.altitude ?? "");
  const [variety, setVariety] = useState(bean?.variety ?? "");
  const [processing, setProcessing] = useState(bean?.processing ?? "");
  const [scaScore, setScaScore] = useState(
    bean?.sca_score != null ? String(bean.sca_score) : "",
  );
  const [farmProducer, setFarmProducer] = useState(bean?.farm_producer ?? "");
  const [url, setUrl] = useState(bean?.url ?? "");
  const [notes, setNotes] = useState(bean?.notes ?? "");
  const [containerId, setContainerId] = useState(
    bean?.container_id != null ? String(bean.container_id) : "",
  );
  const [tagsInput, setTagsInput] = useState(bean?.tags?.join(", ") ?? "");

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [shops, setShops] = useState([]);
  const [containers, setContainers] = useState([]);

  // ── Shop autocomplete state ───────────────────────────────────────────────
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const shopWrapRef = useRef(null);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [duplicateBean, setDuplicateBean] = useState(null);
  const [occupiedOccupant, setOccupiedOccupant] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false); // CB-56

  const [saving, setSaving] = useState(false);

  // ── CB-27 / CB-55: Save active only when required fields are filled ────────
  const canSave = name.trim() && shopInput.trim() && country.trim();

  // ── Fetch shops and containers on mount ───────────────────────────────────
  useEffect(() => {
    apiFetch("/api/shops").then(setShops).catch(console.error);
    apiFetch("/api/containers").then(setContainers).catch(console.error);
  }, []);

  // ── Close shop dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    function handleOutsideClick(e) {
      if (shopWrapRef.current && !shopWrapRef.current.contains(e.target)) {
        setShowShopDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(shopInput.toLowerCase()),
  );

  // ── Collect current field values for change-detection ─────────────────────
  function currentFields() {
    return {
      name,
      shopInput,
      country,
      region,
      altitude,
      variety,
      processing,
      scaScore,
      farmProducer,
      url,
      notes,
      containerId,
      tagsInput,
    };
  }

  // ── Build the payload ─────────────────────────────────────────────────────
  function buildPayload(overrides = {}) {
    return {
      name: name.trim(),
      shop_name: shopInput.trim(),
      country: country.trim(),
      region: region.trim() || null,
      altitude: altitude.trim() || null,
      variety: variety.trim() || null,
      processing: processing.trim() || null,
      sca_score: scaScore ? parseFloat(scaScore) : null,
      farm_producer: farmProducer.trim() || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      container_id: containerId ? parseInt(containerId) : null,
      flavour_tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ...overrides,
    };
  }

  // ── Core save logic ───────────────────────────────────────────────────────
  async function attemptSave(payload) {
    setSaving(true);
    try {
      let data;
      if (isEditing) {
        data = await updateBean(bean.id, payload);
      } else {
        data = await apiFetch("/api/beans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      // CB-32: duplicate bean name (add mode only)
      if (data.conflict === "duplicate_name") {
        setDuplicateBean(data.existingBean);
        setPendingPayload(payload);
        return;
      }

      // CB-39 / CB-64: container occupied
      if (data.conflict === "container_occupied") {
        setOccupiedOccupant(data.occupant);
        setPendingPayload(payload);
        return;
      }

      onSaved(data);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    attemptSave(buildPayload());
  }

  // ── Cancel handling (CB-54 / CB-56) ──────────────────────────────────────
  // In add mode: always close without warning (CB-26 / CB-29).
  // In edit mode: close without warning if nothing changed (CB-54),
  //               show discard dialogue if something changed (CB-56).
  function handleCancel() {
    if (isEditing && hasChanges(bean, currentFields())) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }

  // ── Discard dialogue handlers (CB-57 / CB-58) ─────────────────────────────
  function handleKeepEditing() {
    setShowDiscardDialog(false);
  }

  function handleDiscard() {
    setShowDiscardDialog(false);
    onClose();
  }

  // ── Duplicate bean dialogue handlers (CB-33 / CB-34) ─────────────────────
  function handleDuplicateCancel() {
    setDuplicateBean(null);
    setPendingPayload(null);
  }

  function handleViewExistingBean() {
    setDuplicateBean(null);
    onViewExisting(duplicateBean.id);
    onClose();
  }

  // ── Container occupied dialogue handlers (CB-40 / CB-41 / CB-65 / CB-66) ──
  function handleOccupiedCancel() {
    setOccupiedOccupant(null);
    setPendingPayload(null);
  }

  function handleReplaceContainer() {
    setOccupiedOccupant(null);
    attemptSave({ ...pendingPayload, replaceContainer: true });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bean-form">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bean-form__header">
        <div className="bean-form__header-brand">
          Beans
          <br />
          Tracker
        </div>
        <div className="bean-form__header-subtitle">
          {isEditing ? "Edit card" : "New card"}
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="bean-form__body">
        {/* Required section */}
        <div className="bf-section">
          <div className="bf-section-label bf-section-label--required">
            Required
          </div>

          <div className="bf-field">
            <label className="bf-label">Bean name</label>
            <input
              className="bf-input"
              type="text"
              placeholder="e.g. Yirgacheffe Kochere"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Shop with autocomplete */}
          <div
            className="bf-field"
            ref={shopWrapRef}
            style={{ position: "relative" }}
          >
            <label className="bf-label">Shop</label>
            <input
              className="bf-input"
              type="text"
              placeholder="e.g. Nomad Coffee"
              value={shopInput}
              autoComplete="off"
              onChange={(e) => {
                setShopInput(e.target.value);
                setShowShopDropdown(true);
              }}
              onFocus={() => setShowShopDropdown(true)}
            />
            {showShopDropdown && filteredShops.length > 0 && (
              <div className="bf-dropdown">
                {filteredShops.map((s) => (
                  <div
                    key={s.id}
                    className="bf-dropdown__item"
                    onMouseDown={() => {
                      setShopInput(s.name);
                      setShowShopDropdown(false);
                    }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bf-field">
            <label className="bf-label">Country of origin</label>
            <input
              className="bf-input"
              type="text"
              placeholder="e.g. Ethiopia"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
        </div>

        {/* Optional section */}
        <div className="bf-section">
          <div className="bf-section-label">Optional</div>

          <div className="bf-field">
            <label className="bf-label">Container</label>
            <select
              className="bf-input bf-select"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
            >
              <option value="">None assigned</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.bean_name ? ` · ${c.bean_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="bf-row">
            <div className="bf-field">
              <label className="bf-label">Region</label>
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. Huila"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
            <div className="bf-field">
              <label className="bf-label">Altitude</label>
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. 1,800m"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
              />
            </div>
          </div>

          <div className="bf-row">
            <div className="bf-field">
              <label className="bf-label">Variety</label>
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. Caturra"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
              />
            </div>
            <div className="bf-field">
              <label className="bf-label">Process</label>
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. Washed"
                value={processing}
                onChange={(e) => setProcessing(e.target.value)}
              />
            </div>
          </div>

          <div className="bf-row">
            <div className="bf-field">
              <label className="bf-label">SCA Score</label>
              <input
                className="bf-input"
                type="number"
                placeholder="87.5"
                min="0"
                max="100"
                step="0.25"
                value={scaScore}
                onChange={(e) => setScaScore(e.target.value)}
              />
            </div>
            <div className="bf-field">
              <label className="bf-label">Farm / Producer</label>
              <input
                className="bf-input"
                type="text"
                placeholder="e.g. El Paraíso"
                value={farmProducer}
                onChange={(e) => setFarmProducer(e.target.value)}
              />
            </div>
          </div>

          <div className="bf-field">
            <label className="bf-label">Flavour tags</label>
            <input
              className="bf-input"
              type="text"
              placeholder="e.g. Jasmine, Peach, Bergamot"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <div className="bf-hint">Separate tags with commas</div>
          </div>

          <div className="bf-field">
            <label className="bf-label">Tasting notes</label>
            <textarea
              className="bf-input bf-textarea"
              rows={3}
              placeholder="Free text…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="bf-field">
            <label className="bf-label">Shop URL</label>
            <input
              className="bf-input"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Footer buttons ──────────────────────────────────────────── */}
      <div className="bean-form__footer">
        <button
          className="bean-form__btn bean-form__btn--cancel"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          className="bean-form__btn bean-form__btn--save"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Save Bean"}
        </button>
      </div>

      {/* ── Discard changes warning — CB-56 ─────────────────────────── */}
      {showDiscardDialog && (
        <Dialog
          icon="✏️"
          title="Discard changes?"
          body="You have unsaved changes. Discard them and close, or keep editing?"
          actions={[
            {
              label: "Keep editing",
              variant: "secondary",
              onClick: handleKeepEditing,
            },
            { label: "Discard", variant: "danger", onClick: handleDiscard },
          ]}
        />
      )}

      {/* ── Duplicate bean warning — CB-32 ──────────────────────────── */}
      {duplicateBean && (
        <Dialog
          icon="⚠️"
          title={`"${duplicateBean.name}" already exists`}
          body="A card for these beans is already in your collection. View the existing card or go back and make changes."
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: handleDuplicateCancel,
            },
            {
              label: "View existing",
              variant: "primary",
              onClick: handleViewExistingBean,
            },
          ]}
        />
      )}

      {/* ── Container occupied warning — CB-39 / CB-64 ──────────────── */}
      {occupiedOccupant && (
        <Dialog
          icon="📦"
          title="Container already in use"
          body={`This container currently holds "${occupiedOccupant.name}". Replace it with the new beans?`}
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: handleOccupiedCancel,
            },
            {
              label: "Replace",
              variant: "danger",
              onClick: handleReplaceContainer,
            },
          ]}
        />
      )}
    </div>
  );
}
