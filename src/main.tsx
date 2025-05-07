import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GlobalControlsProvider } from "@/contexts/GlobalControlsContext";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalControlsProvider>
      <App />
    </GlobalControlsProvider>
  </React.StrictMode>
);
