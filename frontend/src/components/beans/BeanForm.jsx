// frontend/src/components/beans/BeanForm.jsx

import { useState, useEffect, useRef, useMemo } from "react";
import { useApi } from "../../api";
import Dialog from "../common/Dialog";
import "./BeanForm.css";

// ─────────────────────────────────────────────────────────────────────────────
//  hasChanges
//
//  Returns true if the user has modified anything relative to the original
//  bean values. Used to decide whether to show the "Discard changes?" warning
//  on cancel (CB-56).
//
//  originalRecipe is a plain object { in, out, time, temp } of strings,
//  populated from the DB fetch in edit mode (see useEffect below).
// ─────────────────────────────────────────────────────────────────────────────
function hasChanges(
  bean,
  fields,
  originalRecipe = { in: "", out: "", time: "", temp: "" },
) {
  if (!bean) return false;
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
    fields.tagsInput !== (bean.tags?.join(", ") ?? "") ||
    fields.recipeIn !== originalRecipe.in ||
    fields.recipeOut !== originalRecipe.out ||
    fields.recipeTime !== originalRecipe.time ||
    fields.recipeTemp !== originalRecipe.temp
  );
}

export default function BeanForm({
  bean = null,
  onClose,
  onSaved,
  onViewExisting,
}) {
  const api = useApi();
  const isEditing = bean !== null;

  // ── Required fields ───────────────────────────────────────────────────────
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

  // ── Espresso recipe fields (double shot) ──────────────────────────────────
  // All stored as strings so they bind cleanly to <input type="number">.
  const [recipeIn, setRecipeIn] = useState("");
  const [recipeOut, setRecipeOut] = useState("");
  const [recipeTime, setRecipeTime] = useState("");
  const [recipeTemp, setRecipeTemp] = useState("");

  // Stores the original recipe values fetched from DB (edit mode only).
  // Used by hasChanges() to detect whether the recipe was modified.
  const originalRecipeRef = useRef({ in: "", out: "", time: "", temp: "" });

  // Auto-calculated ratio — shown read-only in the form.
  // Recomputed whenever In or Out changes.
  const recipeRatio = useMemo(() => {
    const inG = parseFloat(recipeIn);
    const outG = parseFloat(recipeOut);
    if (inG > 0 && outG > 0) {
      return `1:${parseFloat((outG / inG).toFixed(1))}`;
    }
    return "";
  }, [recipeIn, recipeOut]);

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [shops, setShops] = useState([]);
  const [containers, setContainers] = useState([]);

  // ── Shop autocomplete state ───────────────────────────────────────────────
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const shopWrapRef = useRef(null);

  // ── Dialog / conflict state ───────────────────────────────────────────────
  const [duplicateBean, setDuplicateBean] = useState(null);
  const [occupiedOccupant, setOccupiedOccupant] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const [saving, setSaving] = useState(false);

  // ── CB-27 / CB-55: Save enabled only when required fields are filled ───────
  const canSave = name.trim() && shopInput.trim() && country.trim();

  // ── Fetch shops and containers on mount ───────────────────────────────────
  useEffect(() => {
    api.getShops().then(setShops).catch(console.error);
    api.getContainers().then(setContainers).catch(console.error);
  }, [api]);

  // ── In edit mode: fetch full bean details to pre-fill recipe (and tags) ───
  // The bean prop passed from BeanList/BeanCard is the list-level object which
  // does not include recipes or tags. We fetch the full record once on mount.
  useEffect(() => {
    if (!isEditing) return;
    api
      .getBeanById(bean.id)
      .then((data) => {
        // Pre-fill tags only if the prop didn't already supply them
        if (data.tags?.length > 0 && !tagsInput) {
          setTagsInput(data.tags.join(", "));
        }

        // Pre-fill double shot recipe
        const dr = data.recipes?.find((r) => r.shot_type === "double");
        if (dr) {
          const orig = {
            in: dr.dose_in_g != null ? String(dr.dose_in_g) : "",
            out: dr.yield_out_g != null ? String(dr.yield_out_g) : "",
            time: dr.time_seconds != null ? String(dr.time_seconds) : "",
            temp: dr.temp_celsius != null ? String(dr.temp_celsius) : "",
          };
          originalRecipeRef.current = orig;
          setRecipeIn(orig.in);
          setRecipeOut(orig.out);
          setRecipeTime(orig.time);
          setRecipeTemp(orig.temp);
        }
      })
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      recipeIn,
      recipeOut,
      recipeTime,
      recipeTemp,
    };
  }

  // ── Build the API payload ─────────────────────────────────────────────────
  function buildPayload(overrides = {}) {
    const hasRecipe =
      recipeIn.trim() ||
      recipeOut.trim() ||
      recipeTime.trim() ||
      recipeTemp.trim();

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
      container_id: containerId ? parseInt(containerId, 10) : null,
      flavour_tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      // Double shot recipe — send as array so the API handles upsert/delete
      recipes: hasRecipe
        ? [
            {
              shot_type: "double",
              dose_in_g: recipeIn ? parseFloat(recipeIn) : null,
              yield_out_g: recipeOut ? parseFloat(recipeOut) : null,
              time_seconds: recipeTime ? parseInt(recipeTime, 10) : null,
              temp_celsius: recipeTemp ? parseFloat(recipeTemp) : null,
              ratio: recipeRatio || null,
            },
          ]
        : [],
      ...overrides,
    };
  }

  // ── Core save logic ───────────────────────────────────────────────────────
  async function attemptSave(payload) {
    setSaving(true);
    try {
      let data;
      if (isEditing) {
        data = await api.updateBean(bean.id, payload);
      } else {
        data = await api.createBean(payload);
      }

      if (data.conflict === "duplicate_name") {
        setDuplicateBean(data.existingBean);
        setPendingPayload(payload);
        return;
      }
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

  // ── Cancel / discard logic ────────────────────────────────────────────────
  function handleCancel() {
    if (
      isEditing &&
      hasChanges(bean, currentFields(), originalRecipeRef.current)
    ) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }

  function handleKeepEditing() {
    setShowDiscardDialog(false);
  }
  function handleDiscard() {
    setShowDiscardDialog(false);
    onClose();
  }

  // ── Duplicate bean dialog ─────────────────────────────────────────────────
  function handleDuplicateCancel() {
    setDuplicateBean(null);
    setPendingPayload(null);
  }
  function handleViewExistingBean() {
    setDuplicateBean(null);
    onViewExisting(duplicateBean.id);
    onClose();
  }

  // ── Container occupied dialog ─────────────────────────────────────────────
  function handleOccupiedCancel() {
    setOccupiedOccupant(null);
    setPendingPayload(null);
  }
  function handleReplaceContainer() {
    setOccupiedOccupant(null);
    attemptSave({ ...pendingPayload, replaceContainer: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bean-form">
      {/* ── Header ─────────────────────────────────────────────────────── */}
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

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="bean-form__body">
        {/* ── Required section ──────────────────────────────────────── */}
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

        {/* ── Optional section ──────────────────────────────────────── */}
        <div className="bf-section">
          <div className="bf-section-label">Optional</div>

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
        </div>

        {/* ── Espresso recipe section (double shot) ─────────────────── */}
        {/* Only double shot values are stored. The card derives single   */}
        {/* shot values by halving In and Out. Ratio is auto-calculated. */}
        <div className="bf-section">
          <div className="bf-section-label">Espresso recipe · double shot</div>

          <div className="bf-row">
            <div className="bf-field">
              <label className="bf-label">In (g)</label>
              <input
                className="bf-input"
                type="number"
                placeholder="18"
                min="0"
                step="0.1"
                value={recipeIn}
                onChange={(e) => setRecipeIn(e.target.value)}
              />
            </div>
            <div className="bf-field">
              <label className="bf-label">Out (g)</label>
              <input
                className="bf-input"
                type="number"
                placeholder="36"
                min="0"
                step="0.1"
                value={recipeOut}
                onChange={(e) => setRecipeOut(e.target.value)}
              />
            </div>
          </div>

          <div className="bf-row">
            <div className="bf-field">
              <label className="bf-label">Time (s)</label>
              <input
                className="bf-input"
                type="number"
                placeholder="30"
                min="0"
                step="1"
                value={recipeTime}
                onChange={(e) => setRecipeTime(e.target.value)}
              />
            </div>
            <div className="bf-field">
              <label className="bf-label">Temp (°C)</label>
              <input
                className="bf-input"
                type="number"
                placeholder="93"
                min="0"
                step="0.5"
                value={recipeTemp}
                onChange={(e) => setRecipeTemp(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-calculated ratio — only shown when both In and Out are set */}
          {recipeRatio && (
            <div className="bf-ratio">
              <span className="bf-ratio__label">Ratio</span>
              <span className="bf-ratio__value">{recipeRatio}</span>
              <span className="bf-ratio__hint">auto-calculated</span>
            </div>
          )}
        </div>
      </div>
      {/* end bean-form__body */}

      {/* ── Footer buttons ────────────────────────────────────────────── */}
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

      {/* ── Discard changes warning — CB-56 ───────────────────────────── */}
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

      {/* ── Duplicate bean warning — CB-32 ────────────────────────────── */}
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

      {/* ── Container occupied warning — CB-39 / CB-64 ────────────────── */}
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
