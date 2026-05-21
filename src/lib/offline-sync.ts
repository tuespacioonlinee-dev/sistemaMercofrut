/**
 * Sync background del modo offline.
 *
 * Tareas que ejecuta mientras el dispositivo está ONLINE:
 *  - Refrescar snapshots (clientes, productos, parámetros) cada N min.
 *  - Heartbeat cada 1 min (mantiene DispositivoActivo.estado = ONLINE).
 *  - Si quedan < N reservas no consumidas, reservar otro batch.
 *
 * Solo se invoca cuando OFFLINE_MODE_ENABLED=true (el componente que la
 * activa hace early return si el flag está apagado).
 */
import { getOfflineDB } from "./offline-db"
import { getFingerprint } from "./offline-fingerprint"

const INTERVALO_HEARTBEAT_MS  = 60_000
const INTERVALO_SNAPSHOTS_MS  = 5 * 60_000
const INTERVALO_RESERVAS_MS   = 60_000
const RESERVAS_MIN_DISPONIBLE = 5

let arrancado = false

/**
 * Inicia los intervals de sync. Idempotente — múltiples llamadas no
 * duplican los timers.
 *
 * Devuelve función de cleanup para parar todo (útil en unmount o cuando
 * el usuario hace logout).
 */
export function iniciarSyncBackground(): () => void {
  if (typeof window === "undefined") return () => undefined
  if (arrancado) return () => undefined
  arrancado = true

  const timers: ReturnType<typeof setInterval>[] = []

  // Heartbeat inmediato + cada 60s
  void mandarHeartbeat()
  timers.push(setInterval(() => void mandarHeartbeat(), INTERVALO_HEARTBEAT_MS))

  // Refresh inicial + cada 5 min
  void refrescarSnapshots()
  timers.push(setInterval(() => void refrescarSnapshots(), INTERVALO_SNAPSHOTS_MS))

  // Asegurar reservas cada 60s
  void asegurarReservasDisponibles()
  timers.push(setInterval(() => void asegurarReservasDisponibles(), INTERVALO_RESERVAS_MS))

  return () => {
    for (const t of timers) clearInterval(t)
    arrancado = false
  }
}

async function mandarHeartbeat(): Promise<void> {
  try {
    await fetch("/api/offline/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fingerprint: getFingerprint(),
        nombre:      `${navigator.userAgent.split(" ").slice(-2, -1)[0] ?? "Web"}`,
        estado:      "ONLINE",
      }),
    })
  } catch {
    // Silencio — heartbeat fallido se reintenta en próximo interval
  }
}

async function refrescarSnapshots(): Promise<void> {
  const db = getOfflineDB()
  await Promise.all([
    refrescarClientes(db),
    refrescarProductos(db),
    refrescarParametros(db),
  ])
}

async function refrescarClientes(db: ReturnType<typeof getOfflineDB>) {
  try {
    const res = await fetch("/api/snapshot/clientes", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json() as { clientes: unknown[]; ultimaActualizacion: string }
    await db.transaction("rw", db.clientes, db.meta, async () => {
      await db.clientes.clear()
      // El cast es seguro: el route handler hace `select` con la misma forma.
      await db.clientes.bulkAdd(data.clientes as never)
      await db.meta.put({
        clave: "clientes",
        ultimaActualizacion: data.ultimaActualizacion,
        cantidadItems: data.clientes.length,
      })
    })
  } catch {/* silencio */}
}

async function refrescarProductos(db: ReturnType<typeof getOfflineDB>) {
  try {
    const res = await fetch("/api/snapshot/productos", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json() as { productos: unknown[]; ultimaActualizacion: string }
    await db.transaction("rw", db.productos, db.meta, async () => {
      await db.productos.clear()
      await db.productos.bulkAdd(data.productos as never)
      await db.meta.put({
        clave: "productos",
        ultimaActualizacion: data.ultimaActualizacion,
        cantidadItems: data.productos.length,
      })
    })
  } catch {/* silencio */}
}

async function refrescarParametros(db: ReturnType<typeof getOfflineDB>) {
  try {
    const res = await fetch("/api/snapshot/parametros", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json() as { puntoVenta: number; nombreFantasia: string; ultimaActualizacion: string }
    await db.parametros.put({
      clave: "parametros",
      puntoVenta: data.puntoVenta,
      nombreFantasia: data.nombreFantasia,
      ultimaActualizacion: data.ultimaActualizacion,
    })
  } catch {/* silencio */}
}

/**
 * Si hay menos de RESERVAS_MIN_DISPONIBLE reservas no consumidas y no
 * expiradas, llama al server para reservar otro batch de 20.
 */
async function asegurarReservasDisponibles(): Promise<void> {
  try {
    const db = getOfflineDB()
    const ahora = new Date().toISOString()
    // Dexie no indexa booleans — el chequeo va por filter directo.
    const disponibles = await db.reservas
      .filter((r) => !r.consumida && r.expiraEn > ahora)
      .count()

    if (disponibles >= RESERVAS_MIN_DISPONIBLE) return

    // Llamar al server action vía un route handler interno NO existe —
    // las server actions se invocan desde components o forms. Aquí usamos
    // fetch al action wrapper que crearemos en F5. Por ahora exponemos el
    // endpoint POST.
    const res = await fetch("/api/offline/reservar-rango", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fingerprint: getFingerprint(), cantidad: 20 }),
    })
    if (!res.ok) return

    const data = await res.json() as {
      ok: boolean
      token: string
      reservas: Array<{
        numeroFormateado: string
        numero: number
        token: string
        tipo: "REMITO" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "RECIBO"
        letra: "A" | "B" | "C" | "X"
        puntoVenta: number
        expiraEn: string
      }>
    }
    if (!data.ok) return

    await db.reservas.bulkAdd(
      data.reservas.map((r) => ({
        numeroFormateado: r.numeroFormateado,
        numeroValor:      r.numero,
        token:            r.token,
        tipo:             r.tipo,
        letra:            r.letra,
        puntoVenta:       r.puntoVenta,
        reservadoEn:      new Date().toISOString(),
        expiraEn:         r.expiraEn,
        consumida:        false,
      })),
    )
  } catch {/* silencio */}
}
