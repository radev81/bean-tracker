// frontend/src/components/beans/BeanForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Add / edit a bean (CB-25 – CB-41 add, CB-53 – CB-66 edit), Dial design.
//
// Used by pages/BeanFormPage.jsx, which passes the FULL bean (with tags and
// recipes) when editing, or null when adding.
//
// Behaviour kept from the previous version:
//   • Save enabled only when name, shop and country are filled (CB-27/CB-55)
//   • Shop autocomplete from existing shops; a new name creates a shop (CB-36)
//   • Duplicate name warning with "View existing" (CB-32/CB-33)
//   • Container already in use → "Replace?" (CB-39/CB-64/CB-65)
//   • Discard-changes warning when cancelling an edit (CB-56)
//   • Only the double-shot recipe is edited; the ratio is calculated
// New in the Dial design:
//   • Grouped cards, container picker as tiles, process quick-picks,
//     flavour tags as removable chips
//   • Conflicts (409) are now actually shown — before, the error details
//     were lost in api.js and saving silently failed.
// New in Nov 2026:
//   • "Import bean details" (new beans only, CB-95 – CB-104): paste or upload
//     the JSON from the bean-import Claude skill; it fills the form, you
//     review it, pick a container and save as usual.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../../api";
import { getDoubleRecipe } from "../../beanUtils";
import Dialog from "../common/Dialog";
import { Button, Chip, Field, RingBadge, SectionLabel, containerColor } from "../ui";
import { ImportIcon } from "../ui/icons";
import BeanImportSheet from "./BeanImportSheet";
import "./BeanForm.css";

const PROCESS_PICKS = ["Washed", "Natural", "Honey", "Anaerobic"];

// Split "a, b, c" into ["a","b","c"] (trimmed, no empties)
const splitTags = (text) =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const str = (v) => (v != null ? String(v) : "");

// ─────────────────────────────────────────────────────────────────────────────
//  hasChanges — true if anything differs from the saved bean (CB-56)
// ─────────────────────────────────────────────────────────────────────────────
function hasChanges(bean, fields, originalRecipe) {
  if (!bean) return false;
  return (
    fields.name !== (bean.name ?? "") ||
    fields.shopInput !== (bean.shop_name ?? "") ||
    fields.country !== (bean.country ?? "") ||
    fields.region !== (bean.region ?? "") ||
    fields.altitude !== (bean.altitude ?? "") ||
    fields.variety !== (bean.variety ?? "") ||
    fields.processing !== (bean.processing ?? "") ||
    fields.scaScore !== str(bean.sca_score) ||
    fields.farmProducer !== (bean.farm_producer ?? "") ||
    fields.url !== (bean.url ?? "") ||
    fields.notes !== (bean.notes ?? "") ||
    fields.containerId !== str(bean.container_id) ||
    fields.tagsInput !== (bean.tags?.join(", ") ?? "") ||
    fields.recipeIn !== originalRecipe.in ||
    fields.recipeOut !== originalRecipe.out ||
    fields.recipeTime !== originalRecipe.time ||
    fields.recipeTemp !== originalRecipe.temp ||
    fields.recipeNotes !== originalRecipe.notes
  );
}

export default function BeanForm({ bean = null, onClose, onSaved, onViewExisting }) {
  const api = useApi();
  const isEditing = bean !== null;

  // The saved double-shot recipe (edit mode) — the starting values and the
  // reference for "has anything changed?"
  const originalRecipe = useMemo(() => {
    const dr = getDoubleRecipe(bean);
    return {
      in: str(dr?.dose_in_g),
      out: str(dr?.yield_out_g),
      time: str(dr?.time_seconds),
      temp: str(dr?.temp_celsius),
      notes: dr?.notes ?? "",
    };
  }, [bean]);

  // ── Required fields ───────────────────────────────────────────────────────
  const [name, setName] = useState(bean?.name ?? "");
  const [shopInput, setShopInput] = useState(bean?.shop_name ?? "");
  const [country, setCountry] = useState(bean?.country ?? "");

  // ── Optional fields ───────────────────────────────────────────────────────
  const [region, setRegion] = useState(bean?.region ?? "");
  const [altitude, setAltitude] = useState(bean?.altitude ?? "");
  const [variety, setVariety] = useState(bean?.variety ?? "");
  const [processing, setProcessing] = useState(bean?.processing ?? "");
  const [scaScore, setScaScore] = useState(str(bean?.sca_score));
  const [farmProducer, setFarmProducer] = useState(bean?.farm_producer ?? "");
  const [url, setUrl] = useState(bean?.url ?? "");
  const [notes, setNotes] = useState(bean?.notes ?? "");
  const [containerId, setContainerId] = useState(str(bean?.container_id));
  // Tags are kept as "a, b, c" text (as before) and shown as chips.
  // tagDraft is what's being typed in the "Add tag" box.
  const [tagsInput, setTagsInput] = useState(bean?.tags?.join(", ") ?? "");
  const [tagDraft, setTagDraft] = useState("");

  // ── Espresso recipe (double shot), strings for the number inputs ──────────
  const [recipeIn, setRecipeIn] = useState(originalRecipe.in);
  const [recipeOut, setRecipeOut] = useState(originalRecipe.out);
  const [recipeTime, setRecipeTime] = useState(originalRecipe.time);
  const [recipeTemp, setRecipeTemp] = useState(originalRecipe.temp);
  const [recipeNotes, setRecipeNotes] = useState(originalRecipe.notes);

  // Ratio, recalculated whenever In or Out changes
  const recipeRatio = useMemo(() => {
    const inG = parseFloat(recipeIn);
    const outG = parseFloat(recipeOut);
    return inG > 0 && outG > 0 ? `1:${parseFloat((outG / inG).toFixed(1))}` : "";
  }, [recipeIn, recipeOut]);

  // ── Lists for the shop autocomplete and container picker ──────────────────
  const [shops, setShops] = useState([]);
  const [containers, setContainers] = useState([]);
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const shopWrapRef = useRef(null);

  // ── Dialog / conflict state ───────────────────────────────────────────────
  const [duplicateBean, setDuplicateBean] = useState(null);
  const [occupiedOccupant, setOccupiedOccupant] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── Import bean details (CB-95 – CB-104) ──────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // CB-27 / CB-55: Save enabled only when required fields are filled
  const canSave = Boolean(name.trim() && shopInput.trim() && country.trim());

  useEffect(() => {
    api.getShops().then(setShops).catch(console.error);
    api
      .getContainers()
      .then((list) => setContainers([...list].sort((a, b) => a.id - b.id)))
      .catch(console.error);
  }, [api]);

  // Close the shop suggestions when tapping elsewhere
  useEffect(() => {
    function handleOutsideClick(e) {
      if (shopWrapRef.current && !shopWrapRef.current.contains(e.target)) {
        setShowShopDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(shopInput.toLowerCase()) &&
      s.name.toLowerCase() !== shopInput.trim().toLowerCase(),
  );
  const isNewShop =
    shopInput.trim() !== "" &&
    shops.length > 0 &&
    !shops.some((s) => s.name.toLowerCase() === shopInput.trim().toLowerCase());

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tags = splitTags(tagsInput);
  const setTags = (list) => setTagsInput(list.join(", "));

  function addDraftTags() {
    const fresh = splitTags(tagDraft).filter(
      (t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase()),
    );
    if (fresh.length) setTags([...tags, ...fresh]);
    setTagDraft("");
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addDraftTags();
    } else if (e.key === "Backspace" && tagDraft === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  // ── Import: put a checked bean (from parseBeanImport) into the form ──────
  // Only the fields in the JSON are changed; everything else stays as typed.
  // Nothing is saved — the summary banner asks you to review first.
  function applyImport({ bean: data, ignored }) {
    const setters = {
      name: setName,
      country: setCountry,
      region: setRegion,
      altitude: setAltitude,
      variety: setVariety,
      processing: setProcessing,
      farm_producer: setFarmProducer,
      url: setUrl,
      notes: setNotes,
    };
    let count = 0;
    Object.entries(setters).forEach(([key, set]) => {
      if (data[key] != null) {
        set(data[key]);
        count++;
      }
    });

    // Shop: use the spelling from your Shops list when it's the same shop
    let newShop = null;
    if (data.shop_name) {
      const known = shops.find((s) => s.name.toLowerCase() === data.shop_name.toLowerCase());
      setShopInput(known ? known.name : data.shop_name);
      if (!known && shops.length > 0) newShop = data.shop_name;
      count++;
    }
    if (data.sca_score != null) {
      setScaScore(String(data.sca_score));
      count++;
    }
    if (data.flavour_tags) {
      setTagsInput(data.flavour_tags.join(", "));
      setTagDraft("");
      count++;
    }
    if (data.recipe) {
      const r = data.recipe;
      if (r.dose_in_g != null) setRecipeIn(String(r.dose_in_g));
      if (r.yield_out_g != null) setRecipeOut(String(r.yield_out_g));
      if (r.time_seconds != null) setRecipeTime(String(r.time_seconds));
      if (r.temp_celsius != null) setRecipeTemp(String(r.temp_celsius));
      if (r.notes != null) setRecipeNotes(r.notes);
      count++;
    }

    // Required fields the JSON didn't have (they may already be typed)
    const missing = [
      !(data.name || name.trim()) && "bean name",
      !(data.shop_name || shopInput.trim()) && "shop",
      !(data.country || country.trim()) && "country",
    ].filter(Boolean);

    setImportSummary({ count, newShop, missing, ignored, hasRecipe: Boolean(data.recipe) });
    setShowImport(false);
    setSaveError(null);
    window.scrollTo({ top: 0 });
  }

  // ── Change detection ──────────────────────────────────────────────────────
  function currentFields() {
    return {
      name, shopInput, country, region, altitude, variety, processing,
      scaScore, farmProducer, url, notes, containerId, tagsInput,
      recipeIn, recipeOut, recipeTime, recipeTemp, recipeNotes,
    };
  }

  // ── Build the API payload ─────────────────────────────────────────────────
  function buildPayload() {
    const hasRecipe =
      recipeIn.trim() || recipeOut.trim() || recipeTime.trim() || recipeTemp.trim() || recipeNotes.trim();

    // A tag still being typed counts too
    const allTags = [...tags];
    splitTags(tagDraft).forEach((t) => {
      if (!allTags.some((x) => x.toLowerCase() === t.toLowerCase())) allTags.push(t);
    });

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
      flavour_tags: allTags,
      // Double-shot recipe — the API upserts it, or removes it when empty
      recipes: hasRecipe
        ? [
            {
              shot_type: "double",
              dose_in_g: recipeIn ? parseFloat(recipeIn) : null,
              yield_out_g: recipeOut ? parseFloat(recipeOut) : null,
              time_seconds: recipeTime ? parseInt(recipeTime, 10) : null,
              temp_celsius: recipeTemp ? parseFloat(recipeTemp) : null,
              ratio: recipeRatio || null,
              notes: recipeNotes.trim() || null,
            },
          ]
        : [],
    };
  }

  // ── Save, with conflict handling ──────────────────────────────────────────
  // The API answers 409 for conflicts; api.js puts the reply in err.data.
  async function attemptSave(payload) {
    setSaving(true);
    setSaveError(null);
    try {
      const data = isEditing
        ? await api.updateBean(bean.id, payload)
        : await api.createBean(payload);
      onSaved(data);
    } catch (err) {
      const conflict = err.data?.conflict;
      if (conflict === "duplicate_name") {
        setDuplicateBean(err.data.existingBean);
        setPendingPayload(payload);
      } else if (conflict === "container_occupied") {
        setOccupiedOccupant(err.data.occupant);
        setPendingPayload(payload);
      } else {
        console.error("Save failed:", err);
        setSaveError("Could not save. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave || saving) return;
    attemptSave(buildPayload());
  }

  // ── Cancel / discard (CB-56) ──────────────────────────────────────────────
  function handleCancel() {
    if (isEditing && hasChanges(bean, currentFields(), originalRecipe)) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }

  // ── Duplicate dialog (CB-32/33) ───────────────────────────────────────────
  function handleViewExistingBean() {
    const existingId = duplicateBean.id;
    setDuplicateBean(null);
    onViewExisting(existingId);
    onClose();
  }

  // ── Container occupied dialog (CB-39/64/65) ───────────────────────────────
  function handleReplaceContainer() {
    setOccupiedOccupant(null);
    attemptSave({ ...pendingPayload, replaceContainer: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form className="bfm" onSubmit={handleSubmit} noValidate>
      <header className="bfm-head">
        <span className="ui-eyebrow">{isEditing ? "Edit bean" : "New bean"}</span>
        <h1 className="bfm-head__title">{isEditing ? bean.name : "Add a bean"}</h1>
        {!isEditing && (
          <Button variant="secondary" className="bfm-head__import" onClick={() => setShowImport(true)}>
            <ImportIcon />
            Import bean details
          </Button>
        )}
      </header>

      {/* ── After an import: what happened, what's left to do ─────────── */}
      {importSummary && (
        <div className="bfm-imported" role="status">
          <strong>
            Imported {importSummary.count} {importSummary.count === 1 ? "detail" : "details"}
          </strong>{" "}
          — check them, pick a container and tap Save bean.
          {importSummary.missing.length > 0 && <> Still needed: {importSummary.missing.join(", ")}.</>}
          {importSummary.newShop && <> “{importSummary.newShop}” isn’t in your Shops yet — it will be added.</>}
          {importSummary.ignored.length > 0 && <> The container in the JSON was ignored.</>}
        </div>
      )}

      {/* ── Required ─────────────────────────────────────────────────── */}
      <section className="bfm-card" aria-labelledby="bfm-req">
        <SectionLabel as="h2" accent>
          <span id="bfm-req">Required</span>
        </SectionLabel>

        <Field
          label="Bean name"
          placeholder="e.g. Yirgacheffe Kochere"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Shop with suggestions from your existing shops */}
        <div className="bfm-shop" ref={shopWrapRef}>
          <Field
            label="Shop"
            placeholder="e.g. Nomad"
            value={shopInput}
            autoComplete="off"
            onChange={(e) => {
              setShopInput(e.target.value);
              setShowShopDropdown(true);
            }}
            onFocus={() => setShowShopDropdown(true)}
            onKeyDown={(e) => e.key === "Escape" && setShowShopDropdown(false)}
            hint={isNewShop ? "New shop — it will be added to your Shops list" : "Pick one of your shops or type a new one"}
            required
          />
          {showShopDropdown && filteredShops.length > 0 && (
            <ul className="bfm-suggest" aria-label="Your shops">
              {filteredShops.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="bfm-suggest__item"
                    onClick={() => {
                      setShopInput(s.name);
                      setShowShopDropdown(false);
                    }}
                  >
                    {s.name}
                    <span className="bfm-suggest__count">{s.bean_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field
          label="Country of origin"
          placeholder="e.g. Ethiopia"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
        />
      </section>

      {/* ── Container ────────────────────────────────────────────────── */}
      {containers.length > 0 && (
        <section className="bfm-card" aria-labelledby="bfm-ctr">
          <SectionLabel as="h2">
            <span id="bfm-ctr">Container</span>
          </SectionLabel>
          <div className="bfm-tiles" role="radiogroup" aria-labelledby="bfm-ctr">
            <button
              type="button"
              role="radio"
              aria-checked={containerId === ""}
              className={`bfm-tile${containerId === "" ? " bfm-tile--on" : ""}`}
              onClick={() => setContainerId("")}
            >
              <span className="bfm-tile__name">None</span>
            </button>
            {containers.map((c) => {
              const on = containerId === String(c.id);
              const takenByOther = c.bean_id && (!bean || c.bean_id !== bean.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`bfm-tile${on ? " bfm-tile--on" : ""}`}
                  onClick={() => setContainerId(String(c.id))}
                >
                  <RingBadge size={28} ringColor={containerColor(c.name)}>
                    {c.id}
                  </RingBadge>
                  <span className="bfm-tile__name">{c.name}</span>
                  <span className="bfm-tile__sub">
                    {takenByOther ? `has ${c.bean_name}` : "empty"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Origin & cup ─────────────────────────────────────────────── */}
      <section className="bfm-card" aria-labelledby="bfm-origin">
        <SectionLabel as="h2">
          <span id="bfm-origin">Origin &amp; cup · optional</span>
        </SectionLabel>

        <div className="bfm-grid">
          <Field label="Region" placeholder="e.g. Huila" value={region} onChange={(e) => setRegion(e.target.value)} />
          <Field label="Altitude" placeholder="e.g. 1,800 m" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
          <Field label="Variety" placeholder="e.g. Caturra" value={variety} onChange={(e) => setVariety(e.target.value)} />
          <Field
            label="SCA score"
            type="number"
            inputMode="decimal"
            placeholder="87.5"
            min="0"
            max="100"
            step="0.25"
            value={scaScore}
            onChange={(e) => setScaScore(e.target.value)}
          />
        </div>

        <div className="bfm-process">
          <Field
            label="Process"
            placeholder="e.g. Washed"
            value={processing}
            onChange={(e) => setProcessing(e.target.value)}
          />
          <div className="bfm-picks" role="group" aria-label="Quick pick process">
            {PROCESS_PICKS.map((p) => (
              <Chip
                key={p}
                selected={processing.trim().toLowerCase() === p.toLowerCase()}
                onClick={() => setProcessing(p)}
              >
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <Field
          label="Farm / producer"
          placeholder="e.g. El Paraíso"
          value={farmProducer}
          onChange={(e) => setFarmProducer(e.target.value)}
        />

        {/* Flavour tags as chips */}
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="bfm-tag-input">
            Flavour tags
          </label>
          <div className="bfm-tags">
            {tags.map((t) => (
              <Chip key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>
                {t}
              </Chip>
            ))}
            <input
              id="bfm-tag-input"
              className="bfm-tags__input"
              placeholder={tags.length ? "Add tag…" : "e.g. Jasmine, Peach"}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addDraftTags}
              aria-describedby="bfm-tag-hint"
            />
          </div>
          <span id="bfm-tag-hint" className="ui-field__hint">
            Press Enter or comma to add a tag
          </span>
        </div>

        <Field
          label="Tasting notes"
          as="textarea"
          rows={4}
          placeholder="What does it taste like?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Field
          label="Product page"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          hint="Link to this bean at the shop"
        />
      </section>

      {/* ── Espresso recipe (double shot) ────────────────────────────── */}
      <section className="bfm-card" aria-labelledby="bfm-recipe">
        <div className="bfm-recipe-head">
          <SectionLabel as="h2">
            <span id="bfm-recipe">Espresso recipe · double</span>
          </SectionLabel>
          {recipeRatio && <span className="bfm-ratio">Ratio {recipeRatio}</span>}
        </div>
        <div className="bfm-recipe">
          {[
            { label: "In", unit: "g", value: recipeIn, set: setRecipeIn, ph: "18", step: "0.1", mode: "decimal" },
            { label: "Out", unit: "g", value: recipeOut, set: setRecipeOut, ph: "36", step: "0.1", mode: "decimal" },
            { label: "Time", unit: "s", value: recipeTime, set: setRecipeTime, ph: "30", step: "1", mode: "numeric" },
            { label: "Temp", unit: "°C", value: recipeTemp, set: setRecipeTemp, ph: "93", step: "0.5", mode: "decimal" },
          ].map((r) => (
            <label key={r.label} className="bfm-recipe__tile">
              <input
                type="number"
                inputMode={r.mode}
                min="0"
                step={r.step}
                placeholder={r.ph}
                value={r.value}
                onChange={(e) => r.set(e.target.value)}
              />
              <span className="bfm-recipe__label">
                {r.label} {r.unit}
              </span>
            </label>
          ))}
        </div>
        <Field
          label="Recipe notes"
          as="textarea"
          rows={3}
          placeholder="Grind setting, basket, puck prep…"
          value={recipeNotes}
          onChange={(e) => setRecipeNotes(e.target.value)}
        />
      </section>

      {saveError && (
        <p className="bfm-error" role="alert">
          {saveError}
        </p>
      )}

      {/* ── Sticky footer ────────────────────────────────────────────── */}
      <div className="bfm-foot">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!canSave || saving}>
          {saving ? "Saving…" : isEditing ? "Save changes" : "Save bean"}
        </Button>
      </div>

      {/* ── Import bean details (CB-95 – CB-104) ── */}
      {showImport && (
        <BeanImportSheet onClose={() => setShowImport(false)} onImport={applyImport} />
      )}

      {/* ── Discard changes (CB-56) ── */}
      {showDiscardDialog && (
        <Dialog
          title="Discard changes?"
          body="You have unsaved changes. Discard them and close, or keep editing?"
          actions={[
            { label: "Keep editing", variant: "secondary", onClick: () => setShowDiscardDialog(false) },
            {
              label: "Discard",
              variant: "danger",
              onClick: () => {
                setShowDiscardDialog(false);
                onClose();
              },
            },
          ]}
        />
      )}

      {/* ── Duplicate bean (CB-32) ── */}
      {duplicateBean && (
        <Dialog
          title={`“${duplicateBean.name}” already exists`}
          body="This bean is already in your collection. Open the existing one, or go back and change the name."
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => {
                setDuplicateBean(null);
                setPendingPayload(null);
              },
            },
            { label: "View existing", variant: "primary", onClick: handleViewExistingBean },
          ]}
        />
      )}

      {/* ── Container occupied (CB-39 / CB-64) ── */}
      {occupiedOccupant && (
        <Dialog
          title="Container already in use"
          body={`This container holds “${occupiedOccupant.name}”. Replace it? That bean stays in your list without a container.`}
          actions={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => {
                setOccupiedOccupant(null);
                setPendingPayload(null);
              },
            },
            { label: "Replace", variant: "danger", onClick: handleReplaceContainer },
          ]}
        />
      )}
    </form>
  );
}
