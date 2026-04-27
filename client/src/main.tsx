import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initPostHog } from "./shared/lib/posthog";

initPostHog();

createRoot(document.getElementById("root")!).render(<App />);
