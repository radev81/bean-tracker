import { useHandleSignInCallback } from "@logto/react";
import App from "./App";

export default function Root() {
  const { isLoading } = useHandleSignInCallback(() => {
    // Back to the app root (/beans/) after Logto sign-in
    window.location.replace(import.meta.env.BASE_URL);
  });

  // The callback lives at /beans/callback, so match the end of the path
  if (window.location.pathname.endsWith("/callback")) {
    return isLoading ? <div style={{ padding: 24 }}>Signing in…</div> : null;
  }

  return <App />;
}
