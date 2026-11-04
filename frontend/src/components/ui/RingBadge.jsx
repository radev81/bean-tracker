// components/ui/RingBadge.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The small round badge used in lists: a container number, a shop initial,
// or days-off-roast with an optional progress ring.
//
//   <RingBadge ringColor={containerColor("Grey")}>1</RingBadge>
//   <RingBadge muted>–</RingBadge>                       // not in a container
//   <RingBadge progress={0.67}>12d</RingBadge>           // 67% of bag left
//
// It is decorative by default (aria-hidden). Pass `title` when the badge
// carries information that is not repeated in the text next to it.
// ─────────────────────────────────────────────────────────────────────────────

import "./ui.css";

export default function RingBadge({
  children,
  size = 40,
  ringColor,
  progress, // 0…1, draws an arc starting at 12 o'clock
  muted = false,
  title,
  className = "",
}) {
  const stroke = 2.5;
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const hasProgress = typeof progress === "number";

  return (
    <span
      className={`ui-ring${muted ? " ui-ring--muted" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.33),
        ...(ringColor ? { "--ring-color": ringColor } : null),
      }}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <svg
        className="ui-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className={hasProgress ? "ui-ring__track" : "ui-ring__line"}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
        {hasProgress && (
          <circle
            className="ui-ring__progress"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={`${circ * Math.min(1, Math.max(0, progress))} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="ui-ring__text">{children}</span>
    </span>
  );
}
