import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LogtoProvider, useHandleSignInCallback } from "@logto/react";
import "./index.css";
import App from "./App";
import "./App.css";

const logtoConfig = {
  endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
  appId: import.meta.env.VITE_LOGTO_APP_ID,
  resources: [import.meta.env.VITE_API_RESOURCE],
};

function Root() {
  const { isLoading } = useHandleSignInCallback(() => {
    window.location.replace("/");
  });

  if (window.location.pathname === "/callback") {
    return isLoading ? <div style={{ padding: 24 }}>Signing in…</div> : null;
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LogtoProvider config={logtoConfig}>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </LogtoProvider>
  </StrictMode>,
);
