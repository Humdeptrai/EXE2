import { startPwa } from "./features/pwa/pwaRuntime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleProvider } from "./components/GoogleProvider";
import App from "./App";
import "./index.css";

startPwa();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <GoogleProvider>
            <App />
        </GoogleProvider>
    </StrictMode>,
);
