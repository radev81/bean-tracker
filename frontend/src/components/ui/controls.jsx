// components/ui/controls.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Small building blocks used on every screen:
//   Button      – pill buttons: primary (ink), secondary (outline), quiet,
//                 danger, and round icon buttons
//   Chip        – tags and quick filters (tap to toggle, optional ×)
//   Segmented   – 2–4 option switch (e.g. "Most beans | A–Z")
//   Field       – label + input / textarea / select, with hint and error
//   PageHeader  – small caps eyebrow + big title + actions on the right
//   SectionLabel– the small caps label above a group
//
// The same look is available as CSS classes (ui-btn ui-btn--primary …) so a
// React Router <Link> can be styled as a button too.
// ─────────────────────────────────────────────────────────────────────────────

import { useId } from "react";
import "./ui.css";

// ── Button ───────────────────────────────────────────────────────────────────
// variant: "primary" | "secondary" | "quiet" | "danger"
// icon:    true for a round 44×44 icon-only button (aria-label required)
export function Button({
  variant = "secondary",
  icon = false,
  block = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  if (icon && !rest["aria-label"]) {
    console.warn("Icon-only <Button> needs an aria-label");
  }
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    icon && "ui-btn--icon",
    block && "ui-btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
// Static:      <Chip>Bergamot</Chip>
// Toggle:      <Chip selected={on} onClick={toggle}>SCA 88+</Chip>
// Removable:   <Chip onRemove={() => removeTag(t)}>{t}</Chip>
export function Chip({ selected = false, onClick, onRemove, children, className = "" }) {
  const cls = `ui-chip${selected ? " ui-chip--selected" : ""}${
    onRemove ? " ui-chip--removable" : ""
  } ${className}`;

  if (onClick) {
    return (
      <button type="button" className={cls} aria-pressed={selected} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="ui-chip__remove"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === "string" ? children : "tag"}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ── Segmented ────────────────────────────────────────────────────────────────
// options: [{ value: "count", label: "Most beans" }, …]
export function Segmented({ options, value, onChange, ariaLabel, size = "md" }) {
  return (
    <div
      className={`ui-seg ui-seg--${size}`}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`ui-seg__opt${o.value === value ? " ui-seg__opt--on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
// <Field label="Bean name" value={name} onChange={e => setName(e.target.value)} />
// <Field label="Tasting notes" as="textarea" rows={4} … />
// <Field label="Container" as="select"><option>…</option></Field>
// Font size is 16px so iPhones don't zoom in when the field is focused.
export function Field({
  label,
  hint,
  error,
  as = "input",
  className = "",
  children,
  id: idProp,
  ...rest
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const Control = as;

  return (
    <div className={`ui-field${error ? " ui-field--error" : ""} ${className}`}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <Control
        id={id}
        className="ui-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...rest}
      >
        {as === "select" ? children : undefined}
      </Control>
      {hint && !error && (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="ui-field__error">
          {error}
        </span>
      )}
    </div>
  );
}

// ── PageHeader ───────────────────────────────────────────────────────────────
// <PageHeader eyebrow="34 beans · 17 shops" title="Beans" actions={<…/>} />
export function PageHeader({ eyebrow, title, actions }) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__text">
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <h1 className="ui-page-header__title">{title}</h1>
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, as = "h2", accent = false }) {
  const Tag = as;
  return (
    <Tag className={`ui-eyebrow${accent ? " ui-eyebrow--accent" : ""}`}>{children}</Tag>
  );
}
