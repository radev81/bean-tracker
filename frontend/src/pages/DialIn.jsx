// pages/DialIn.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dial-in: fine-tune a bean's double-shot recipe on the big dial.
// /beans/bean/:id/dial
//
//  • Tap a tile (In / Out / Time / Temp) to put it on the dial
//  • Drag around the ring, use ± or the arrow keys to change it
//  • The ratio updates live
//  • Save writes the double-shot recipe through PUT /api/beans/:id (the same
//    endpoint the edit form uses), keeping every other field unchanged.
//    The recipe notes and any old single-shot recipe are left as they are.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../api";
import { beanToPayload, computeRatio, getDoubleRecipe, ratioNumber } from "../beanUtils";
import Dialog from "../components/common/Dialog";
import { Button, Dial } from "../components/ui";
import { BackIcon, MinusIcon, PlusIcon } from "../components/ui/icons";
import { snap } from "../components/ui/geometry";
import "./DialIn.css";

// Each recipe value: its range on the dial and how far one step moves it
const PARAMS = [
  { key: "dose", label: "Dose", short: "In", unit: "g", min: 14, max: 24, step: 0.1, decimals: 1, fallback: 18 },
  { key: "yield", label: "Yield", short: "Out", unit: "g", min: 20, max: 60, step: 0.5, decimals: 1, fallback: 36 },
  { key: "time", label: "Time", short: "Time", unit: "s", min: 15, max: 45, step: 1, decimals: 0, fallback: 28 },
  { key: "temp", label: "Temp", short: "Temp", unit: "°C", min: 86, max: 96, step: 0.5, decimals: 1, fallback: 93 },
];

// A stored value outside the usual range widens the dial instead of clipping
function rangeFor(p, value) {
  return {
    min: Math.min(p.min, Math.floor(value)),
    max: Math.max(p.max, Math.ceil(value)),
  };
}

function valuesFrom(recipe) {
  return {
    dose: recipe?.dose_in_g ?? PARAMS[0].fallback,
    yield: recipe?.yield_out_g ?? PARAMS[1].fallback,
    time: recipe?.time_seconds ?? PARAMS[2].fallback,
    temp: recipe?.temp_celsius ?? PARAMS[3].fallback,
  };
}

export default function DialIn() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();

  const [bean, setBean] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState(null);
  const [initial, setInitial] = useState(null);
  const [selected, setSelected] = useState("yield");
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getBeanById(id)
      .then((data) => {
        if (cancelled) return;
        const v = valuesFrom(getDoubleRecipe(data));
        setBean(data);
        setValues(v);
        setInitial(v);
      })
      .catch(() => !cancelled && setError("Could not load this bean."));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const dirty =
    values && initial && PARAMS.some((p) => values[p.key] !== initial[p.key]);

  function leave() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(`/bean/${id}`, { replace: true });
  }

  function handleBack() {
    if (dirty) setConfirmLeave(true);
    else leave();
  }

  function setValue(key, raw) {
    const p = PARAMS.find((x) => x.key === key);
    const { min, max } = rangeFor(p, values[key]);
    const next = snap(Math.min(max, Math.max(min, raw)), p.step);
    setValues((v) => ({ ...v, [key]: next }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const old = getDoubleRecipe(bean);
    const double = {
      shot_type: "double",
      dose_in_g: values.dose,
      yield_out_g: values.yield,
      time_seconds: Math.round(values.time),
      temp_celsius: values.temp,
      ratio: computeRatio(values.dose, values.yield),
      notes: old?.notes ?? null,
    };
    const recipes = [...(bean.recipes ?? []).filter((r) => r.shot_type !== "double"), double];
    try {
      await api.updateBean(bean.id, beanToPayload(bean, { recipes }));
      navigate(`/bean/${bean.id}`, { replace: true });
    } catch {
      setError("Could not save the recipe. Try again.");
      setSaving(false);
    }
  }

  const backButton = (
    <Button icon variant="secondary" aria-label="Back" onClick={handleBack}>
      <BackIcon />
    </Button>
  );

  if (!bean || !values) {
    return (
      <div className="app-fullscreen di">
        <header className="di-bar">{backButton}</header>
        <p className="app-page-message">{error || "Loading recipe…"}</p>
      </div>
    );
  }

  const p = PARAMS.find((x) => x.key === selected);
  const { min, max } = rangeFor(p, values[p.key]);
  const ratio = ratioNumber(values.dose, values.yield);
  const show = (param) => values[param.key].toFixed(param.decimals);

  return (
    <div className="app-fullscreen di">
      <header className="di-bar">
        {backButton}
        <div className="di-bar__title">
          <span className="ui-eyebrow">Dial-in · double shot</span>
          <span className="di-bar__name">{bean.name}</span>
        </div>
        <span className="di-bar__spacer" aria-hidden="true" />
      </header>

      {/* ── The dial ── */}
      <section className="di-dial" aria-label={`${p.label} control`}>
        <Dial
          value={values[p.key]}
          min={min}
          max={max}
          step={p.step}
          size={288}
          label={p.label}
          unit={p.unit}
          display={show(p)}
          ariaLabel={`${p.label} in ${p.unit === "°C" ? "degrees Celsius" : p.unit === "s" ? "seconds" : "grams"}`}
          onChange={(v) => setValue(p.key, v)}
        >
          <span className="ui-dial__label">{p.label}</span>
          <span className="ui-dial__readout">
            <span className="ui-dial__value">{show(p)}</span>
            <span className="ui-dial__unit">{p.unit}</span>
          </span>
          <span className="di-ratio">Ratio 1:{ratio ? ratio.toFixed(1) : "–"}</span>
        </Dial>
        <div className="di-steppers">
          <Button
            icon
            variant="secondary"
            aria-label={`Decrease ${p.label.toLowerCase()}`}
            onClick={() => setValue(p.key, values[p.key] - p.step)}
          >
            <MinusIcon />
          </Button>
          <span className="di-hint">Drag the ring or tap ±</span>
          <Button
            icon
            variant="secondary"
            aria-label={`Increase ${p.label.toLowerCase()}`}
            onClick={() => setValue(p.key, values[p.key] + p.step)}
          >
            <PlusIcon />
          </Button>
        </div>
      </section>

      {/* ── Parameter tiles ── */}
      <div className="di-tiles" role="radiogroup" aria-label="Value on the dial">
        {PARAMS.map((param) => (
          <button
            key={param.key}
            type="button"
            role="radio"
            aria-checked={selected === param.key}
            className={`di-tile${selected === param.key ? " di-tile--on" : ""}${
              initial[param.key] !== values[param.key] ? " di-tile--changed" : ""
            }`}
            onClick={() => setSelected(param.key)}
          >
            <span className="di-tile__value">{show(param)}</span>
            <span className="di-tile__label">
              {param.short} {param.unit}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="di-error" role="alert">{error}</p>}

      <div className="di-actions">
        <Button variant="secondary" onClick={() => setValues(initial)} disabled={!dirty || saving}>
          Reset
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save recipe"}
        </Button>
      </div>

      {confirmLeave && (
        <Dialog
          title="Discard changes?"
          body="Your recipe changes haven't been saved."
          actions={[
            { label: "Keep editing", variant: "secondary", onClick: () => setConfirmLeave(false) },
            { label: "Discard", variant: "danger", onClick: leave },
          ]}
        />
      )}
    </div>
  );
}
