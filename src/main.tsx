import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyStoredAppearance } from "./lib/settingsContext";
import "./lib/i18n";
import "./styles.css";

// Before the first render, not in an effect after it: see the comment on the
// function. Nothing is on screen yet at this point, so there is nothing to fade.
applyStoredAppearance();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
