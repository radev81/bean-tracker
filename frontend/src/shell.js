// src/shell.js
// ─────────────────────────────────────────────────────────────────────────────
// Lets any page talk to the app shell (App.jsx → AppShell) without passing
// props down through every component. For now it only opens the account
// sheet (theme + sign out), used by <AccountButton /> in each page header.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext } from "react";

export const ShellContext = createContext({ openAccount: () => {} });

export const useShell = () => useContext(ShellContext);
