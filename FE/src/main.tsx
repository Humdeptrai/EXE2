import { startPwa } from "./features/pwa/pwaRuntime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleProvider } from "./components/GoogleProvider";
import App from "./App";
import "./index.css";
import "./theme/dark.generated.css";
import "./theme/theme.css";
import { initializeTheme } from "./theme/theme";

initializeTheme();
startPwa();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <GoogleProvider>
            <App />
        </GoogleProvider>
    </StrictMode>,
);
