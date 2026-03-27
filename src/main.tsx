import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SoulsStoreProvider } from "./context/SoulsStore";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SoulsStoreProvider>
      <App />
    </SoulsStoreProvider>
  </React.StrictMode>,
);
