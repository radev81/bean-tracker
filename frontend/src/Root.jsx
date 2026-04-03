import { useHandleSignInCallback } from "@logto/react";
import App from "./App";

export default function Root() {
  const { isLoading } = useHandleSignInCallback(() => {
    window.location.replace("/");
  });

  if (window.location.pathname === "/callback") {
    return isLoading ? <div style={{ padding: 24 }}>Signing in…</div> : null;
  }

  return <App />;
}
