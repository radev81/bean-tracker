// components/ui/AccountButton.jsx
// The round person button at the top right of each main page.
// Opens the account sheet (theme switch + sign out) that lives in AppShell.

import { useShell } from "../../shell";
import { Button } from "./controls";

export default function AccountButton() {
  const { openAccount } = useShell();
  return (
    <Button
      icon
      variant="secondary"
      aria-label="Account: theme and sign out"
      onClick={openAccount}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </Button>
  );
}
