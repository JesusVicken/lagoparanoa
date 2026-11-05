"use client";

import { useEffect } from "react";

/** Registra o service worker (apenas em produção, para não interferir no HMR). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("Falha ao registrar service worker:", err));
  }, []);

  return null;
}
