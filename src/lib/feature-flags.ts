/**
 * Feature flags del sistema.
 *
 * Reglas:
 * - Por defecto TODOS los flags están en false.
 * - Cuando un flag es false, el sistema se comporta EXACTAMENTE como antes
 *   de que el flag existiera. Cero regresión.
 * - Los flags se setean por env var. Para que sean visibles desde el client,
 *   tienen que tener prefijo NEXT_PUBLIC_ (Next.js los inyecta en bundle).
 *
 * IMPORTANTE: el flag se evalúa al momento del import. En SSR el server
 * obtiene su valor; en client el bundle ya tiene el valor del build.
 * Cualquier toggle requiere redeploy.
 */

/**
 * Modo offline limitado. Cuando true:
 *  - Permite carga de venta + remito durante un corte de conexión.
 *  - Otros módulos (cobros, caja, reportes, etc.) quedan bloqueados offline.
 *  - Activa banner, Dexie, snapshot routes, pre-reserva de numeración.
 *
 * Cuando false (default): el sistema se comporta como hoy. Nada del flujo
 * offline se ejecuta.
 *
 * Soporta ambas convenciones por compatibilidad:
 *   OFFLINE_MODE_ENABLED              — server-only
 *   NEXT_PUBLIC_OFFLINE_MODE_ENABLED  — accesible desde client
 */
export const OFFLINE_MODE_ENABLED: boolean =
  process.env.OFFLINE_MODE_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_OFFLINE_MODE_ENABLED === "true"
