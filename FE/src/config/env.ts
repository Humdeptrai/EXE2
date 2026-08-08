const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

function deriveWebSocketUrl(value: string) {
  try {
    const url = new URL(value);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/api\/v1\/?$/, "") + "/ws";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "ws://localhost:8080/ws";
  }
}

export const env = {
  API_URL: apiUrl,
  WS_URL: import.meta.env.VITE_WS_URL || deriveWebSocketUrl(apiUrl),
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
};
