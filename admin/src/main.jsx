import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";

import Router from "./Router";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { AuthProvider } from "./components/context/AuthContext";
import { ToastProvider } from "./components/context/ToastContext";
import { NotificationProvider } from "./components/context/NotificationContext";

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
  </StrictMode>
);
