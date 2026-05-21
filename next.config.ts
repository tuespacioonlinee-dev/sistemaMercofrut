import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const baseConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Exponer el flag al bundle del cliente sin requerir NEXT_PUBLIC_ duplicado:
  // si está activo via OFFLINE_MODE_ENABLED en el server, lo replicamos al client.
  env: {
    NEXT_PUBLIC_OFFLINE_MODE_ENABLED:
      process.env.NEXT_PUBLIC_OFFLINE_MODE_ENABLED ??
      process.env.OFFLINE_MODE_ENABLED ??
      "false",
  },
}

// PWA — caching del app shell + offline awareness.
// Cuando OFFLINE_MODE_ENABLED=false el SW se registra pero solo cachea assets
// estáticos (mejora performance) sin lógica offline activa. Cero regresión.
const withPWA = withPWAInit({
  dest: "public",
  // Deshabilitamos el SW en desarrollo para que no caché cosas mientras
  // estamos iterando. En producción se activa siempre.
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Runtime caching: páginas de /ventas accesibles incluso sin red. Las APIs
    // NO se cachean — esos requests deben fallar limpio para que el cliente
    // detecte el estado offline. Usamos RegExp (más estable que funciones,
    // que workbox serializa al SW y pueden romper bundling).
    runtimeCaching: [
      {
        urlPattern: /\/ventas(\/.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-ventas",
          expiration: { maxAgeSeconds: 60 * 60 * 24 }, // 24h
          networkTimeoutSeconds: 3,
        },
      },
    ],
  },
  cacheOnFrontEndNav: true,
})

export default withPWA(baseConfig) as NextConfig
