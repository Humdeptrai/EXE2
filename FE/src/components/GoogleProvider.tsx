import type { PropsWithChildren } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { env } from "../config/env";

export function GoogleProvider({ children }: PropsWithChildren) {
  if (!env.GOOGLE_CLIENT_ID) return children;
  return <GoogleOAuthProvider clientId={env.GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
}
