// admin/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";

import Router from "./Router";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { AuthProvider } from "./components/context/AuthContext";
import { ToastProvider } from "./components/context/ToastContext";
import { NotificationProvider } from "./components/context/NotificationContext";
import { initDevClock } from "./components/utils/devClock";

// Dev clock is read before the first render, so every screen starts on the
// same day as the server. In production the offset is 0 and nothing changes.
initDevClock().finally(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <RouterProvider router={Router} />
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});