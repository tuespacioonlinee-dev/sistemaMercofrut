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
  },
  // NO interceptamos fetch a /api/* — esos requests deben fallar limpio
  // cuando no hay red, así el cliente detecta el offline correctamente.
  // El cache es solo para assets estáticos (HTML, JS, CSS, fuentes).
  cacheOnFrontEndNav: true,
})

export default withPWA(baseConfig) as NextConfig
