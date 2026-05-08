/**
 * Helpers para envío de formularios:
 *  - generarClientRequestId: UUID estable por intento de submit (idempotency-key).
 *  - submitSeguro: ejecuta una server action con try/catch y devuelve un resultado homogéneo
 *    incluso ante errores de red, así el botón siempre se desbloquea y el usuario ve un mensaje.
 *
 * Uso típico desde un form:
 *   const idemRef = useRef(generarClientRequestId())
 *   const res = await submitSeguro(() => crearVenta({ ...data, clientRequestId: idemRef.current }))
 *   if (!res.ok) { toast.error(res.error); return }
 */

export type ResultadoAction<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; networkError?: boolean }

/** Genera un UUID v4. Usa crypto.randomUUID si está disponible, fallback manual si no. */
export function generarClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback (browsers viejos)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Envuelve una llamada a server action y normaliza el resultado.
 * - Si la action devuelve { error }, lo propaga.
 * - Si throw (network, timeout, server crash), devuelve un error legible y networkError=true
 *   para que el caller pueda ofrecer reintentar SIN perder los datos del formulario.
 */
export async function submitSeguro<T extends { error?: string } & Record<string, unknown>>(
  fn: () => Promise<T>
): Promise<ResultadoAction<T>> {
  try {
    const res = await fn()
    if (res && typeof res === "object" && "error" in res && res.error) {
      return { ok: false, error: res.error }
    }
    return { ok: true, data: res }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    // Heurística: errores típicos de red/timeout
    const esRed = /fetch|network|timeout|aborted|disconnect|ECONNRESET|Failed to fetch/i.test(msg)
    return {
      ok: false,
      error: esRed
        ? "No se pudo conectar con el servidor. Revisá tu WiFi y reintentá — los datos del formulario no se perdieron."
        : `Ocurrió un error al guardar: ${msg}`,
      networkError: esRed,
    }
  }
}
