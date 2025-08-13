import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./ErrorBoundary";

// Import robust service worker registration
import { registerSW } from './sw-register';

// Register service worker with safe update flow
registerSW();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
