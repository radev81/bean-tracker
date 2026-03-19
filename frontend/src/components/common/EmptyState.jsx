/**
 * EmptyState.jsx — reusable empty-state panel
 * ─────────────────────────────────────────────
 * Used by CB-01 (no beans), and later by Containers/Shops tabs.
 *
 * Props:
 *   icon      string   — emoji or text icon  (default: "☕")
 *   title     string   — headline
 *   body      string   — supporting sentence
 *   action    string   — button label (optional; omit to hide button)
 *   onAction  function — called when button is clicked
 */

import "./EmptyState.css";

export default function EmptyState({
  icon = "☕",
  title,
  body,
  action,
  onAction,
}) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="empty-state__title">{title}</p>
      {body && <p className="empty-state__body">{body}</p>}
      {action && (
        <button className="empty-state__btn" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
