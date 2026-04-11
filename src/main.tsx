import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { SoulsStoreProvider } from "./context/SoulsStore";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SoulsStoreProvider>
      <App />
    </SoulsStoreProvider>
  </React.StrictMode>,
);
