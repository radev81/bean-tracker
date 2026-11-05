/**
 * EmptyState.jsx — reusable empty-state panel
 * ─────────────────────────────────────────────
 * Shown when a list has nothing in it yet (beans, containers, shops).
 *
 * Props:
 *   title     string   — headline
 *   body      string   — supporting sentence
 *   action    string   — button label (optional; omit to hide button)
 *   onAction  function — called when button is clicked
 *   icon      node     — optional decoration above the title
 */

import { Button } from "../ui";
import "./EmptyState.css";

export default function EmptyState({ icon = null, title, body, action, onAction }) {
  return (
    <div className="empty-state" role="status">
      {icon && (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="empty-state__title">{title}</p>
      {body && <p className="empty-state__body">{body}</p>}
      {action && (
        <Button variant="primary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
