// components/ui/Dial.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The round gauge at the heart of the Dial design.
//
// Read-only use (e.g. SCA score):
//   <Dial value={88} min={80} max={100} label="SCA" display="88" size={132} />
//
// Interactive use (e.g. recipe yield) — pass onChange and a step:
//   <Dial value={yieldG} min={20} max={60} step={0.5}
//         label="Yield" unit="g" display={yieldG.toFixed(1)}
//         onChange={setYieldG} ariaLabel="Yield in grams" />
//   • Drag around the ring with finger or mouse
//   • Arrow keys / Page Up-Down / Home / End when focused
//
// Highlight a range of ticks (e.g. the 7–28 day resting window):
//   <Dial value={12} min={0} max={35} band={[7, 28]} … />
//
// Custom centre content: pass children instead of label/display/unit.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from "react";
import {
  angleAt,
  arcLengths,
  fraction,
  fractionFromPoint,
  polar,
  snap,
} from "./geometry";
import "./ui.css";

// All drawing happens in a 264×264 box; the SVG scales to `size`.
const BOX = 264;
const C = BOX / 2; // centre
const R_FACE = 128; // dark disc
const R_TICK_OUT = 124; // outer end of tick marks
const R_ARC = 104; // value arc

export default function Dial({
  value,
  min = 0,
  max = 100,
  step = 1,
  size = 264,
  ticks = 60,
  majorEvery = 10,
  band, // [from, to] in value units — ticks inside are brighter
  litTicks = !band, // light ticks up to the value (when no band)
  knob, // show the round knob at the value (default: when interactive)
  label,
  display, // formatted value text; defaults to String(value)
  unit,
  caption, // small line under the value (e.g. "Peak window")
  ariaLabel,
  ariaValueText,
  onChange,
  children,
  className = "",
}) {
  const svgRef = useRef(null);
  const interactive = typeof onChange === "function";
  const showKnob = knob ?? interactive;

  const f = fraction(value, min, max);
  const { circumference, arc } = arcLengths(R_ARC);
  const bandFrom = band ? fraction(band[0], min, max) : 0;
  const bandTo = band ? fraction(band[1], min, max) : 0;

  // Tick marks around the edge
  const tickLines = [];
  for (let i = 0; i <= ticks; i++) {
    const t = i / ticks;
    const major = i % majorEvery === 0;
    const lit = band ? t >= bandFrom && t <= bandTo : litTicks && t <= f;
    const deg = angleAt(t);
    const p1 = polar(C, C, R_TICK_OUT, deg);
    const p2 = polar(C, C, major ? R_TICK_OUT - 10 : R_TICK_OUT - 6, deg);
    tickLines.push(
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        className={`ui-dial__tick${major ? " ui-dial__tick--major" : ""}${
          lit ? " ui-dial__tick--lit" : ""
        }`}
      />,
    );
  }

  const knobPos = polar(C, C, R_ARC, angleAt(f));

  // ── Interaction ────────────────────────────────────────────────────────────
  function setFromFraction(t) {
    const next = snap(min + t * (max - min), step, min);
    if (next !== value) onChange(Math.min(max, Math.max(min, next)));
  }

  function handlePointer(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = rect.width / BOX;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setFromFraction(fractionFromPoint(x, y, C, C));
  }

  function onPointerDown(e) {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointer(e);
  }

  function onPointerMove(e) {
    if (!interactive || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    handlePointer(e);
  }

  function onKeyDown(e) {
    if (!interactive) return;
    const big = step * 10;
    const moves = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
    };
    let next;
    if (e.key in moves) next = value + moves[e.key];
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    onChange(Math.min(max, Math.max(min, snap(next, step, min))));
  }

  const sliderProps = interactive
    ? {
        role: "slider",
        tabIndex: 0,
        "aria-label": ariaLabel || label,
        "aria-valuemin": min,
        "aria-valuemax": max,
        "aria-valuenow": value,
        "aria-valuetext":
          ariaValueText || `${display ?? value}${unit ? ` ${unit}` : ""}`,
        onPointerDown,
        onPointerMove,
        onKeyDown,
      }
    : {
        role: "img",
        "aria-label":
          ariaLabel ||
          `${label ? `${label} ` : ""}${display ?? value}${unit ? ` ${unit}` : ""}`,
      };

  return (
    <div
      className={`ui-dial${interactive ? " ui-dial--interactive" : ""} ${className}`}
      style={{ "--dial-size": `${size}px` }}
      {...sliderProps}
    >
      <svg
        ref={svgRef}
        className="ui-dial__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${BOX} ${BOX}`}
        aria-hidden="true"
      >
        <circle className="ui-dial__face" cx={C} cy={C} r={R_FACE} />
        {tickLines}
        <circle
          className="ui-dial__track"
          cx={C}
          cy={C}
          r={R_ARC}
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(${angleAt(0)} ${C} ${C})`}
        />
        <circle
          className="ui-dial__value-arc"
          cx={C}
          cy={C}
          r={R_ARC}
          strokeDasharray={`${arc * f} ${circumference}`}
          transform={`rotate(${angleAt(0)} ${C} ${C})`}
        />
        {showKnob && (
          <circle
            className={`ui-dial__knob${interactive ? "" : " ui-dial__knob--marker"}`}
            cx={knobPos.x}
            cy={knobPos.y}
            r={interactive ? 10 : 7}
          />
        )}
      </svg>

      <div className="ui-dial__centre">
        {children ?? (
          <>
            {label && <span className="ui-dial__label">{label}</span>}
            <span className="ui-dial__readout">
              <span className="ui-dial__value">{display ?? value}</span>
              {unit && <span className="ui-dial__unit">{unit}</span>}
            </span>
            {caption && <span className="ui-dial__caption">{caption}</span>}
          </>
        )}
      </div>
    </div>
  );
}
