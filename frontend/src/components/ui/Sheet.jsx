// components/ui/Sheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A bottom sheet: slides up from the bottom of the screen (on desktop it is
// centred and capped in width). Used for "Fill container", the account menu,
// filters, and shop actions.
//
//   <Sheet open={open} onClose={() => setOpen(false)} title="Fill container 2">
//     …content…
//   </Sheet>
//
// Closes on: the × button, tapping the dimmed backdrop, or the Escape key.
// While open, the page behind it does not scroll.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useId, useRef } from "react";
import "./ui.css";

export default function Sheet({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null);
  const titleId = useId();

  // Keep the latest onClose in a ref. Parents often pass a new arrow function
  // on every render; without the ref the effect below would re-run on each
  // keystroke inside the sheet and pull focus away from the input.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Remember what had focus, move focus into the sheet
    const previouslyFocused = document.activeElement;
    // Move focus into the sheet — unless a field inside already took it
    // (e.g. an input with autoFocus)
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    // Escape closes the sheet
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current?.();
    }
    document.addEventListener("keydown", onKey);

    // Stop the page behind from scrolling
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="ui-sheet">
      {/* Backdrop: a mouse/touch convenience. Keyboard users have Esc + × */}
      <div className="ui-sheet__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="ui-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <span className="ui-sheet__grabber" aria-hidden="true" />
        <div className="ui-sheet__head">
          {title && (
            <h2 id={titleId} className="ui-sheet__title">
              {title}
            </h2>
          )}
          <button
            type="button"
            className="ui-btn ui-btn--icon ui-btn--quiet"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="ui-sheet__body">{children}</div>
        {footer && <div className="ui-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}
