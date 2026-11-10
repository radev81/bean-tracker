import { useHandleSignInCallback } from "@logto/react";
import App from "./App";
import { takeReturnPath } from "./authReturn";

export default function Root() {
  const { isLoading } = useHandleSignInCallback(() => {
    // Back to where "Sign in" was tapped (e.g. a scanned container page),
    // otherwise the app root (/beans/)
    window.location.replace(takeReturnPath());
  });

  // The callback lives at /beans/callback, so match the end of the path
  if (window.location.pathname.endsWith("/callback")) {
    return isLoading ? <div style={{ padding: 24 }}>Signing in…</div> : null;
  }

  return <App />;
}
