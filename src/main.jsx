// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import "./index.css";

// 🔑 Provider oficial de MiniKit (IMPORTANTE)
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* MiniKit envuelve a toda tu app */}
    <MiniKitProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </MiniKitProvider>
  </React.StrictMode>
);
