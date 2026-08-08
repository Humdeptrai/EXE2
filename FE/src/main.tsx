import { StrictMode, type PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { env } from "./config/env";
import "./index.css";

function GoogleProvider({ children }: PropsWithChildren) {
  if (!env.GOOGLE_CLIENT_ID) return children;
  return <GoogleOAuthProvider clientId={env.GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleProvider>
      <App />
    </GoogleProvider>
  </StrictMode>,
);
