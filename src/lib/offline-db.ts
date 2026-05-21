/**
 * Schema IndexedDB (vía Dexie.js) para el modo offline.
 *
 * Stores:
 *  - ventasOffline:  ventas cargadas mientras estaba sin conexión
 *  - clientes:       snapshot local del catálogo (refrescado online)
 *  - productos:      snapshot local del catálogo
 *  - reservas:       números pre-reservados disponibles para consumir
 *  - meta:           metadata (última actualización de cada snapshot)
 *
 * SOLO se importa cuando OFFLINE_MODE_ENABLED=true. La importación dispara
 * que Dexie abra la DB del navegador. Cuando el flag está apagado, este
 * módulo nunca se carga (gracias a imports condicionales en los callers).
 */
import Dexie, { type Table } from "dexie"

export type EstadoVentaOffline = "PENDIENTE_SYNC" | "SINCRONIZADA" | "ERROR_SYNC"

export interface ClienteSnap {
  id:                string
  nombreRazonSocial: string
  documento:         string
}

export interface ProductoSnap {
  id:                string
  codigo:            string
  nombre:            string
  precioVenta:       number
  stockAproximado:   number
  unidadBaseId:      string
  unidadBaseAbrev:   string
}

export interface LineaSnap {
  productoId:     string
  productoNombre: string  // congelado al momento de la venta offline
  productoCodigo: string
  unidadId:       string
  unidadAbrev:    string
  cantidad:       number
  precioUnitario: number
  subtotal:       number
}

export interface VentaOffline {
  id:                string
  numeroReservado:   string   // "0001-00000124"
  numeroToken:       string
  numeroValor:       number
  fecha:             string   // ISO
  clienteSnapshot:   ClienteSnap
  lineas:            LineaSnap[]
  subtotal:          number
  descuento:         number
  total:             number
  condicion:         "CONTADO"
  observaciones?:    string
  clientRequestId:   string   // UUID — idempotency en sync
  estado:            EstadoVentaOffline
  errorDetalle?:     string
  ventaIdServer?:    string
  remitoIdServer?:   string
  creadaEn:          string
  sincronizadaEn?:   string
}

export interface ReservaLocal {
  token:            string
  numeroFormateado: string
  numeroValor:      number
  tipo:             "REMITO" | "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "RECIBO"
  letra:            "A" | "B" | "C" | "X"
  puntoVenta:       number
  reservadoEn:      string
  expiraEn:         string
  consumida:        boolean
}

export interface SnapshotMeta {
  clave:               "clientes" | "productos" | "parametros"
  ultimaActualizacion: string
  cantidadItems?:      number
}

export interface ParametrosSnap {
  clave:           "parametros"   // PK fija — solo hay una fila
  puntoVenta:      number
  nombreFantasia:  string
  ultimaActualizacion: string
}

export class OfflineDB extends Dexie {
  ventasOffline!: Table<VentaOffline, string>
  clientes!:      Table<ClienteSnap,  string>
  productos!:     Table<ProductoSnap, string>
  reservas!:      Table<ReservaLocal, string> // PK: numeroFormateado (único entre token+numero)
  meta!:          Table<SnapshotMeta, string> // PK: clave
  parametros!:    Table<ParametrosSnap, string> // PK: clave

  constructor() {
    super("mercofrut-offline")
    this.version(1).stores({
      ventasOffline: "id, estado, creadaEn",
      clientes:      "id, nombreRazonSocial, documento",
      productos:     "id, codigo, nombre",
      reservas:      "numeroFormateado, token, consumida, expiraEn",
      meta:          "clave",
      parametros:    "clave",
    })
  }
}

// Lazy singleton: solo se crea cuando se accede por primera vez.
// Esto permite que la importación del módulo NO toque IndexedDB hasta
// que un componente activo realmente lo necesite.
let _db: OfflineDB | null = null
export function getOfflineDB(): OfflineDB {
  if (typeof window === "undefined") {
    throw new Error("offlineDB solo está disponible en el cliente")
  }
  if (!_db) _db = new OfflineDB()
  return _db
}
