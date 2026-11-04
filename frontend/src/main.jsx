import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LogtoProvider } from "@logto/react";
import "./index.css";
import "./App.css";
import Root from "./Root";

const logtoConfig = {
  endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
  appId: import.meta.env.VITE_LOGTO_APP_ID,
  resources: [import.meta.env.VITE_API_RESOURCE],
};

const container = document.getElementById("root");
let root = container._reactRoot;
if (!root) {
  root = createRoot(container);
  container._reactRoot = root;
}

root.render(
  <StrictMode>
    <LogtoProvider config={logtoConfig}>
      {/* basename = the Vite base path ("/beans/") without the trailing slash.
          Routes below are then written WITHOUT the /beans prefix:
          "/" = /beans/, "/containers" = /beans/containers, etc. */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Root />
      </BrowserRouter>
    </LogtoProvider>
  </StrictMode>,
);
