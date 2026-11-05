// components/ui/icons.jsx
// Small stroke icons used in buttons. They inherit the text colour.
// Always decorative (aria-hidden) — the button around them carries the label.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const PlusIcon = ({ size = 16 }) => (
  <svg {...base} width={size} height={size} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ size = 16 }) => (
  <svg {...base} width={size} height={size} strokeWidth={2}>
    <path d="M5 12h14" />
  </svg>
);

export const BackIcon = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronIcon = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const EditIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

export const MoreIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

export const ExternalIcon = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </svg>
);

export const SearchIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const FilterIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const StarIcon = ({ size = 18, filled = false }) => (
  <svg {...base} width={size} height={size} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

export const DialIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4.5 17a9 9 0 1 1 15 0" />
    <path d="M12 12l4-4" />
  </svg>
);

export const CopyIcon = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </svg>
);
