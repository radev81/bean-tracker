import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../../api";
import Dialog from "../common/Dialog";
import "./BeanForm.css";

export default function BeanForm({ onClose, onSaved, onViewExisting }) {
  // ── Required fields ───────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [shopInput, setShopInput] = useState("");
  const [country, setCountry] = useState("");

  // ── Optional fields ───────────────────────────────────────────────────
  const [region, setRegion] = useState("");
  const [altitude, setAltitude] = useState("");
  const [variety, setVariety] = useState("");
  const [processing, setProcessing] = useState("");
  const [scaScore, setScaScore] = useState("");
  const [farmProducer, setFarmProducer] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [containerId, setContainerId] = useState("");
  const [tagsInput, setTagsInput] = useState(""); // comma-separated

  // ── Dropdown data ─────────────────────────────────────────────────────
  const [shops, setShops] = useState([]);
  const [containers, setContainers] = useState([]);

  // ── Shop autocomplete state ───────────────────────────────────────────
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const shopWrapRef = useRef(null);

  // ── Dialog state ──────────────────────────────────────────────────────
  const [duplicateBean, setDuplicateBean] = useState(null); // CB-32
  const [occupiedOccupant, setOccupiedOccupant] = useState(null); // CB-39
  const [pendingPayload, setPendingPayload] = useState(null);

  const [saving, setSaving] = useState(false);

  // ── CB-27: Save is only active when all required fields are filled ─────
  const canSave = name.trim() && shopInput.trim() && country.trim();

  // ── Fetch shops and containers on mount ───────────────────────────────
  useEffect(() => {
    apiFetch("/api/shops").then(setShops).catch(console.error);
    apiFetch("/api/containers").then(setContainers).catch(console.error);
  }, []);

  // ── Close shop dropdown on outside click (CB-30) ─────────────────────
  useEffect(() => {
    function handleOutsideClick(e) {
      if (shopWrapRef.current && !shopWrapRef.current.contains(e.target)) {
        setShowShopDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Shops filtered by what user has typed
  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(shopInput.toLowerCase()),
  );

  // ── Build payload from current form state ─────────────────────────────
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

  // ── Core save logic — handles conflict responses ───────────────────────
  async function attemptSave(payload) {
    setSaving(true);
    try {
      const data = await apiFetch("/api/beans", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // CB-32: duplicate bean name detected
      if (data.conflict === "duplicate_name") {
        setDuplicateBean(data.existingBean);
        setPendingPayload(payload);
        return;
      }

      // CB-39: chosen container is already occupied
      if (data.conflict === "container_occupied") {
        setOccupiedOccupant(data.occupant);
        setPendingPayload(payload);
        return;
      }

      // Success — CB-35 or CB-38
      onSaved(data);
    } catch (err) {
      console.error("Save failed:", err);
      // TODO: show user-facing error message in a future polish pass
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    attemptSave(buildPayload());
  }

  // ── Duplicate bean dialogue handlers (CB-33, CB-34) ───────────────────

  function handleDuplicateCancel() {
    // CB-34: dismiss warning, return to form with fields intact
    setDuplicateBean(null);
    setPendingPayload(null);
  }

  function handleViewExistingBean() {
    // CB-33: close form, expand the existing card in the list
    setDuplicateBean(null);
    onViewExisting(duplicateBean.id);
    onClose();
  }

  // ── Container occupied dialogue handlers (CB-40, CB-41) ──────────────

  function handleOccupiedCancel() {
    // CB-41: dismiss warning, return to form with fields intact
    setOccupiedOccupant(null);
    setPendingPayload(null);
  }

  function handleReplaceContainer() {
    // CB-40: confirm replacement and save
    setOccupiedOccupant(null);
    attemptSave({ ...pendingPayload, replaceContainer: true });
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="bean-form">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bean-form__header">
        <div className="bean-form__header-brand">
          Beans
          <br />
          Tracker
        </div>
        <div className="bean-form__header-subtitle">New card</div>
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

          {/* Shop with autocomplete — CB-30, CB-31 */}
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
                    // onMouseDown instead of onClick so it fires before the input blur
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
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="bean-form__btn bean-form__btn--save"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Bean"}
        </button>
      </div>

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

      {/* ── Container occupied warning — CB-39 ──────────────────────── */}
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
