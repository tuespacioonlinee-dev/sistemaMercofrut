# Modo Offline Limitado — Diseño

> **Estado:** Borrador para aprobación (Fase 1).
> **Scope:** Solo carga de venta + remito durante un corte de conexión.
> **Feature flag:** `OFFLINE_MODE_ENABLED` (default `false`).

---

## 0. Definición precisa de scope

| Operación | Online | Offline |
|---|:---:|:---:|
| Cargar venta CONTADO + remito | ✅ | ✅ (queda pendiente de sync) |
| Cargar venta CUENTA_CORRIENTE | ✅ | ❌ (requiere consulta de saldo del cliente) |
| Cobrar | ✅ | ❌ |
| Pagar proveedor | ✅ | ❌ |
| Alta de cliente | ✅ | ❌ |
| Consultar cuenta corriente | ✅ | ❌ |
| Reportes | ✅ | ❌ |
| Gestión de stock | ✅ | ❌ |
| Abrir/cerrar caja | ✅ | ❌ |
| Emitir notas C/D | ✅ | ❌ |

**Bloqueo offline = banner + redirección a `/ventas/nueva` con mensaje claro.**

## 1. Feature flag `OFFLINE_MODE_ENABLED`

### Lectura

```ts
// src/lib/feature-flags.ts
export const OFFLINE_MODE_ENABLED =
  process.env.OFFLINE_MODE_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_OFFLINE_MODE_ENABLED === "true"
```

- Server: lee `OFFLINE_MODE_ENABLED` (no público).
- Client: lee `NEXT_PUBLIC_OFFLINE_MODE_ENABLED` (público porque se inyecta en bundle).
- Ambas deben estar en `true` para activar todo.

### Comportamiento por estado

| Flag | Banner | OfflineGuard | Form venta usa Dexie | API snapshots | Server actions offline | Service Worker registrado |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **`false` (default)** | nunca renderiza | nunca bloquea | nunca | 404 | retornan `{ error: "Modo offline deshabilitado" }` | ✅ (cachea assets igual) |
| **`true`** | renderiza según connectivity | bloquea rutas no permitidas si offline | sí cuando offline | activas | activas | ✅ con lógica offline |

### Garantía clave

**Con flag = false el sistema se comporta EXACTAMENTE como hoy.** Sin regresiones. Sin imports extra ejecutándose. El componente `<OfflineBanner>` retorna `null` directo en el primer render si el flag está apagado, sin tocar Dexie ni connectivity.

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ App shell    │  │ useConnectivity │  │ Service Worker   │    │
│  │ (cacheada)   │  │ (online/offline)│  │ (cachea assets)  │    │
│  └──────────────┘  └─────────────────┘  └──────────────────┘    │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ Dexie.js     │  │ FormVenta       │  │ OfflineBanner /  │    │
│  │ - ventas     │  │ (lee snapshots  │  │ OfflineGuard     │    │
│  │ - clientes   │  │  si offline)    │  │                  │    │
│  │ - productos  │  │                 │  │                  │    │
│  │ - parametros │  │                 │  │                  │    │
│  │ - reservas   │  │                 │  │                  │    │
│  └──────────────┘  └─────────────────┘  └──────────────────┘    │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server (Next.js + Prisma + Neon)                                │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ /api/healthcheck     │  │ /api/snapshot/{clientes,         │ │
│  │ (200 OK + ts)        │  │   productos,parametros}          │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ server/actions/offline.ts                                 │   │
│  │  - reservarRangoOffline(cantidad)                         │   │
│  │  - sincronizarVentaOffline(ventaData)                     │   │
│  │  - heartbeat(dispositivoId)                               │   │
│  │  - liberarReservasExpiradas()                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ DB                                                        │   │
│  │  - NumeroComprobanteReservado  (nueva tabla)              │   │
│  │  - DispositivoActivo           (nueva tabla)              │   │
│  │  - SecuenciaComprobante        (Bloque A — sin cambios)   │   │
│  │  - Venta / Remito / etc.       (sin cambios)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Schema de DB (Fase 2)

```prisma
enum EstadoDispositivo {
  ONLINE
  OFFLINE
}

model NumeroComprobanteReservado {
  id              String           @id @default(cuid())
  tipo            TipoComprobante  // del Bloque A
  letra           LetraComprobante // del Bloque A
  puntoVenta      Int
  numero          Int              // valor de SecuenciaComprobante.ultimoNumero ya incrementado
  numeroFormateado String          // ej "0001-00000124"
  token           String           // identifica el lote de reserva (mismo para los N números del batch)
  dispositivoId   String
  usuarioId       String
  reservadoEn     DateTime         @default(now())
  expiraEn        DateTime         // reservadoEn + TTL (24h por defecto)
  consumido       Boolean          @default(false)
  ventaIdConsumida String?         @unique  // FK opcional a Venta cuando se consume

  dispositivo DispositivoActivo @relation(fields: [dispositivoId], references: [id])
  usuario     Usuario           @relation("ReservasNumero", fields: [usuarioId], references: [id])

  @@unique([tipo, letra, puntoVenta, numero]) // mismo namespace que SecuenciaComprobante
  @@index([token])
  @@index([dispositivoId])
  @@index([expiraEn, consumido])
}

model DispositivoActivo {
  id                String            @id @default(cuid())
  usuarioId         String
  nombre            String?           // ej "Chrome - PC Mostrador"
  fingerprint       String            @unique // ID estable generado en el cliente
  estado            EstadoDispositivo @default(ONLINE)
  ultimoHeartbeat   DateTime          @default(now())
  ventasOfflinePendientes Int        @default(0) // contador para banner multi-dispositivo
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  usuario   Usuario                       @relation("DispositivosUsuario", fields: [usuarioId], references: [id])
  reservas  NumeroComprobanteReservado[]

  @@index([usuarioId])
  @@index([estado, ultimoHeartbeat])
}
```

**Decisiones:**
- **TTL de reserva: 24h.** Suficiente para un día de trabajo offline sin bloquear permanentemente la numeración si un dispositivo no vuelve.
- **`numero` independiente de `SecuenciaComprobante.ultimoNumero`:** la reserva consume el siguiente de la secuencia (vía `generarNumeroComprobante`) y guarda el valor. La secuencia avanza al reservar, no al consumir. **Implicancia:** si un rango reservado expira sin consumirse, esos números quedan "saltados" en la secuencia. Es aceptable (la AFIP permite gaps; lo importante es no duplicar).
- **`fingerprint`** del lado del cliente: hash de `userAgent + screen + timezone + accountId`. Estable entre sesiones del mismo navegador.

## 4. Pre-reserva de numeración

### Server action

```ts
// src/server/actions/offline.ts
export async function reservarRangoOffline(input: {
  fingerprint: string
  cantidad: number     // default 20, max 50
  tipo?: TipoComprobante     // default "REMITO"
  letra?: LetraComprobante   // default "X"
}): Promise<{ ok: true; token: string; reservas: ReservaSerializada[] } | { error: string }>
```

**Flujo dentro de `$transaction`:**
1. Validar feature flag activo.
2. `requireRole(...ROLES_VENTAS)`.
3. Upsert `DispositivoActivo` por fingerprint (estado: ONLINE, heartbeat now).
4. Obtener `puntoVenta` default vía `obtenerPuntoVentaDefault(tx)` (helper existente).
5. Llamar `generarNumeroComprobante(tx, {...})` N veces. Cada llamada consume +1 de `SecuenciaComprobante`.
6. Crear N filas de `NumeroComprobanteReservado` con mismo `token` (uuid).
7. Retornar la lista con tokens y números formateados.

**Reentrada:** se puede llamar varias veces; cada llamada genera un token nuevo y un rango nuevo. El cliente acumula los rangos en Dexie.

### Limpieza periódica

```ts
// src/server/actions/offline.ts
export async function liberarReservasExpiradas(): Promise<{ liberadas: number }>
```

Borra `NumeroComprobanteReservado` con `expiraEn < now` y `consumido = false`. Lo invoca:
- Job programado: route handler `/api/cron/offline-cleanup` (configurar en Vercel Cron + plan Hobby ya tiene cron diario).
- Manualmente desde la pantalla de admin (out of scope inicial — solo cron).

## 5. Almacenamiento local — Dexie.js

### Schema (`src/lib/offline-db.ts`)

```ts
import Dexie, { Table } from "dexie"

export interface VentaOffline {
  id: string                     // local cuid
  numeroReservado: string         // ej "0001-00000124"
  numeroToken: string             // para liberar la reserva al descartar
  fecha: string                   // ISO
  clienteSnapshot: ClienteSnap
  lineas: LineaSnap[]
  subtotal: number
  descuento: number
  total: number
  condicion: "CONTADO"            // solo CONTADO offline
  observaciones?: string
  clientRequestId: string         // idempotency para sincronizarVentaOffline
  estado: "PENDIENTE_SYNC" | "SINCRONIZADA" | "ERROR_SYNC"
  errorDetalle?: string
  ventaIdServer?: string          // se completa al sincronizar
  creadaEn: string                // ISO
  sincronizadaEn?: string
}

export interface ClienteSnap {
  id: string
  nombreRazonSocial: string
  documento: string
  // suficiente para identificar; al sincronizar el server resuelve por id
}

export interface ProductoSnap {
  id: string
  codigo: string
  nombre: string
  precioVenta: number
  stockAproximado: number
  unidadBaseId: string
  unidadBaseAbrev: string
}

export interface ReservaLocal {
  token: string
  numeroFormateado: string
  numeroValor: number
  tipo: "REMITO"
  letra: "X"
  puntoVenta: number
  reservadoEn: string
  expiraEn: string
  consumida: boolean
}

export interface SnapshotMeta {
  clave: "clientes" | "productos" | "parametros"
  ultimaActualizacion: string
}

export class OfflineDB extends Dexie {
  ventasOffline!:    Table<VentaOffline, string>
  clientes!:         Table<ClienteSnap, string>
  productos!:        Table<ProductoSnap, string>
  reservas!:         Table<ReservaLocal, string>  // PK: token
  meta!:             Table<SnapshotMeta, string>  // PK: clave

  constructor() {
    super("mercofrut-offline")
    this.version(1).stores({
      ventasOffline: "id, estado, creadaEn",
      clientes:      "id, nombreRazonSocial, documento",
      productos:     "id, codigo, nombre",
      reservas:      "token, consumida, expiraEn",
      meta:          "clave",
    })
  }
}

export const offlineDB = new OfflineDB()
```

### Refresh de snapshots (background)

`src/lib/offline-sync.ts`:
- Cada **5 min** mientras online: fetch a `/api/snapshot/{clientes,productos,parametros}` → upsert en Dexie.
- Cada **1 min** mientras online: heartbeat → `POST /api/offline/heartbeat`.
- Si quedan menos de **5 reservas no consumidas y no expiradas**: reservar otro batch de 20.

### Routes nuevas

| Endpoint | Método | Comportamiento |
|---|---|---|
| `/api/healthcheck` | GET | `{ ok: true, timestamp }` — siempre 200 si el server responde |
| `/api/snapshot/clientes` | GET | Lista de clientes activos (proyección mínima). Cacheado server-side 30s |
| `/api/snapshot/productos` | GET | Lista de productos activos con stockTotal |
| `/api/snapshot/parametros` | GET | `{ puntoVenta, nombreNegocio, ... }` |
| `/api/offline/heartbeat` | POST | `{ fingerprint, estado }` → upsert DispositivoActivo |
| `/api/offline/lock-status` | GET | `{ otrosDispositivosOffline: bool, fingerprintsOtros: string[] }` |

## 6. Hook `useConnectivity`

```ts
// src/hooks/useConnectivity.ts
export function useConnectivity(): {
  online: boolean
  lastCheck: Date | null
  forceCheck: () => Promise<void>
}
```

**Algoritmo:**
- State inicial: `navigator.onLine` (puede mentir, pero es punto de partida).
- Cada **30s** mientras la app esté visible: `fetch("/api/healthcheck", { signal: AbortSignal.timeout(5000) })`.
  - 200 OK → `online = true`.
  - Cualquier error o timeout → `online = false`.
- Eventos `online`/`offline` del navegador: re-chequean al instante (no esperan los 30s).
- Si `OFFLINE_MODE_ENABLED = false`: el hook siempre retorna `online = true`. **Cero overhead** cuando el flag está apagado.

## 7. Componentes UI

### `<OfflineBanner>` (en `(dashboard)/layout.tsx`)

| Estado | Renderiza |
|---|---|
| Flag off | `null` (nunca renderiza) |
| Flag on + online + sin pendientes | `null` |
| Flag on + online + N pendientes | banner verde "Conexión recuperada. N ventas pendientes de sincronizar. [Ir a sincronizar]" |
| Flag on + offline | banner naranja "Modo offline. Solo podés cargar ventas. [Cargar venta]" |
| Flag on + online + OTRO dispositivo offline (lock) | banner gris "Otro dispositivo está en modo offline. No podés cargar ventas hasta que sincronice." |

### `<OfflineGuard>` por ruta

Componente client wrapper que:
- Si flag off → renderiza children sin tocar nada.
- Si flag on + online → renderiza children.
- Si flag on + offline + ruta permitida (`/ventas/nueva`, `/ventas/pendientes`, `/ventas/sincronizar`) → renderiza children.
- Si flag on + offline + ruta NO permitida → renderiza pantalla bloqueante con CTA "Ir a cargar venta".

Se inserta en cada Server Component de las rutas bloqueadas (cobros, caja, cuentas, reportes, etc.) como wrapper.

### Form de venta — bifurcación

`FormVenta.tsx` ya existente. Cambio mínimo:
- Agregar `const { online } = useConnectivity()`.
- Agregar `const offlineActivo = OFFLINE_MODE_ENABLED && !online`.
- Si `offlineActivo`:
  - Reemplazar los selects de cliente/producto por listas de `offlineDB.clientes` / `offlineDB.productos`.
  - Forzar `condicion = "CONTADO"` y deshabilitar el toggle.
  - Al submit: tomar primera `ReservaLocal` con `consumida = false` y `expiraEn > now`. Si no hay → error "Sin números reservados disponibles". Si hay → guardar en `offlineDB.ventasOffline` con estado `PENDIENTE_SYNC` y marcar reserva consumida.
- Si `!offlineActivo`:
  - Comportamiento actual exactamente igual (server action `crearVenta`).

## 8. Sincronización

### Server action `sincronizarVentaOffline`

```ts
export async function sincronizarVentaOffline(input: {
  clienteId: string
  detalles: VentaInput["detalles"]
  descuento: number
  observaciones?: string
  numeroReservadoToken: string  // identifica el rango de reserva
  numeroReservadoFormateado: string
  clientRequestId: string       // idempotency
  creadaEnOfflineISO: string    // fecha original de la carga offline
}): Promise<{ ok: true; ventaId: string; remitoId: string } | { error: string }>
```

**Flujo dentro de `$transaction`:**
1. Validar feature flag activo.
2. `requireRole(...ROLES_VENTAS)`.
3. Buscar `NumeroComprobanteReservado` por `(token, numeroFormateado)` y verificar:
   - Existe.
   - No expirado.
   - No consumido.
   - Coincide con dispositivo y usuario (anti-spoofing).
4. Si idempotency: si ya existe `Venta` con `clientRequestId`, retornar esa.
5. Llamar lógica de `crearVenta` PERO **sin** generar número (usar el reservado). Crear `Remito` con `numero = reservado.numeroFormateado`.
6. Marcar `reservado.consumido = true` y `ventaIdConsumida = venta.id`.
7. Resto de efectos (stock, cuenta, caja) iguales a `crearVenta`.

**Errores recuperables (queda en ERROR_SYNC, el usuario puede reintentar):**
- Número reservado expirado.
- Cliente no existe (eliminado entre offline y sync).
- Stock insuficiente real (rara — el server permite stock negativo igual que `crearVenta`).

**Errores irrecuperables (queda en ERROR_SYNC, debe descartar):**
- Caja cerrada al momento del sync (en ese caso no podemos registrar MovimientoCaja CONTADO_HABER).

### UI `/ventas/sincronizar`

- Lee `offlineDB.ventasOffline` con `estado = PENDIENTE_SYNC` o `ERROR_SYNC`.
- Cada venta muestra: número reservado, cliente, total, líneas, fecha local, estado, error si aplica.
- Botones por venta: "Sincronizar", "Editar", "Descartar".
- Botón global: "Sincronizar todas" (loop secuencial, no batch).
- Tras sincronizar OK: estado → `SINCRONIZADA`. Se mantiene en Dexie 24h para que el usuario pueda revisar. Después se borra automáticamente.

### Detección de cambio online → notificación

`useConnectivity` dispara evento. `<OfflineBanner>` cambia a banner verde con CTA. No hay sync automático (el usuario tiene que confirmar — evita sync silencioso de algo que el usuario quiera revisar).

## 9. Multi-dispositivo lock

- `heartbeat` cada 1 min escribe `ultimoHeartbeat` y `estado`.
- Cuando un cliente entra a offline: marca `estado = OFFLINE` en su próximo heartbeat (el último online antes del corte). El server detecta dispositivos sin heartbeat reciente y los marca offline en `liberarReservasExpiradas`.
- Otro cliente online consulta `/api/offline/lock-status` cada vez que entra a `/ventas/nueva`:
  - Si hay OTRO dispositivo del mismo negocio con estado OFFLINE → muestra banner gris y bloquea botón de "Confirmar venta".
- **Importante:** el lock NO impide otras operaciones (cobros, reportes, etc.). Solo impide nueva venta — para evitar conflicto de numeración entre el reservado offline y el que generaría el helper online.

## 10. Estructura de archivos final

```
docs/modo-offline-diseño.md                          (este archivo)

prisma/
  schema.prisma                                       (+ 2 modelos + enum)
  migrations/<ts>_modo_offline/migration.sql

src/
  lib/
    feature-flags.ts                                  (OFFLINE_MODE_ENABLED)
    offline-db.ts                                     (Dexie schema + instancia)
    offline-sync.ts                                   (background refresh + reservas)
    offline-fingerprint.ts                            (genera ID estable)
    validaciones/offline.ts                           (Zod schemas)
  hooks/
    useConnectivity.ts
    useVentasOffline.ts
    useSnapshotClientes.ts
    useSnapshotProductos.ts
    useSnapshotParametros.ts
    useReservasOffline.ts
  components/shared/
    OfflineBanner.tsx
    OfflineGuard.tsx
  server/
    actions/
      offline.ts                                      (reservar / sync / heartbeat / cleanup)
      offline.test.ts                                 (vitest)
    lib/
      dispositivos.ts                                 (helper heartbeat)
  app/
    api/
      healthcheck/route.ts
      offline/heartbeat/route.ts
      offline/lock-status/route.ts
      snapshot/clientes/route.ts
      snapshot/productos/route.ts
      snapshot/parametros/route.ts
      cron/offline-cleanup/route.ts
    (dashboard)/
      layout.tsx                                      (+ <OfflineBanner>)
      ventas/
        nueva/FormVenta.tsx                           (bifurcación)
        pendientes/page.tsx                           (nuevo)
        sincronizar/page.tsx                          (nuevo)
        sincronizar/PantallaSync.tsx                  (nuevo)
      cobros/page.tsx, caja/page.tsx, etc.            (+ <OfflineGuard>)

next.config.ts                                        (wrap con @ducanh2912/next-pwa)
public/
  manifest.webmanifest
  icon-192.png + icon-512.png                         (placeholders por ahora)

tests/
  e2e/
    15-offline-flag-off.spec.ts                       (regresión: sistema sin cambios)
    16-offline-banner.spec.ts                         (banner ON con flag on)
    17-offline-venta.spec.ts                          (cargar venta offline en Dexie)
    18-offline-bloqueos.spec.ts                       (rutas bloqueadas)
    19-offline-sync.spec.ts                           (sincronizar y errores)
```

## 11. Plan de tests

### Unit (Vitest)

| Test | Cubre |
|---|---|
| `offline.test.ts` | `reservarRangoOffline` consume secuencia, persiste reservas, retorna lista |
| `offline.test.ts` | `sincronizarVentaOffline` con número reservado válido crea venta |
| `offline.test.ts` | `sincronizarVentaOffline` con número expirado retorna error |
| `offline.test.ts` | `sincronizarVentaOffline` con clientRequestId duplicado es idempotente |
| `offline.test.ts` | `liberarReservasExpiradas` solo borra las expiradas no consumidas |

### E2E (Playwright)

| Test | Cubre |
|---|---|
| `15-offline-flag-off` | Con flag OFF: ninguno de los componentes nuevos se renderiza. Suite del sistema actual sigue verde igual. Confirmá flag de regresión: 0 diff visible vs main. |
| `16-offline-banner` | Con flag ON + simulación offline: aparece banner naranja. Con vuelta a online: aparece banner verde con CTA. |
| `17-offline-venta` | Con flag ON + offline: ir a /ventas/nueva, cargar venta usando cliente y producto del snapshot, verificar que queda en IndexedDB con estado PENDIENTE_SYNC. |
| `18-offline-bloqueos` | Con flag ON + offline: navegar a /cobros/nuevo, /caja, /cuentas/consulta → ver pantalla bloqueante con CTA a /ventas/nueva. |
| `19-offline-sync` | Cargar 3 ventas offline. Volver online. Click "Sincronizar todas". Verificar 3 ventas creadas en DB con números correlativos del rango reservado. Simular conflict en una para verificar manejo de error. |

**Total nuevo: ~5 unit + 5 E2E.**

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Gap en numeración por reservas expiradas | Aceptable — AFIP permite gaps. Documentado. |
| Dos dispositivos offline simultáneos | Lock multi-dispositivo bloquea al segundo. |
| Stock real distinto del snapshot al sincronizar | El server NO bloquea ventas por stock — registra el movimiento y queda stock negativo. Coherente con el comportamiento actual de `crearVenta`. |
| Caja se cierra entre offline y sync | Sync falla en ese ítem con error claro. Usuario tiene que abrir nueva caja y reintentar. |
| Token de reserva spoofeado | Validamos `usuarioId + dispositivoId` en `sincronizarVentaOffline`. |
| Schema cambia (ej. nuevo campo Cliente) entre snapshot y sync | Snapshot tiene proyección mínima — solo lo que el form necesita. Al sincronizar, el server completa el resto desde el `clienteId` real. |
| Service Worker cachea versión vieja del bundle tras deploy | `@ducanh2912/next-pwa` viene con `skipWaiting + clientsClaim`. Banner verde notifica si hay update. |
| **El usuario habilita el flag sin entender** | Documentación en este archivo + checklist en `.env.example`. Aviso explícito en commit messages. |

## 12.b — LIMITACIÓN conocida: SSR fetch en `/ventas/nueva`

`/ventas/nueva/page.tsx` es Server Component que hace `obtenerClientes()` +
`prisma.producto.findMany()` durante SSR. **Si el usuario está realmente
offline y recarga la página, el SSR fetch falla y la página no renderiza.**

El modo offline funciona en este escenario:
- Usuario navega a `/ventas/nueva` mientras está **online**: la página carga OK.
- Pierde conexión mientras está en la página: `useConnectivity` lo detecta,
  `FormVentaSwitch` bifurca a `FormVentaOffline` que usa Dexie. **OK**.

Pero NO funciona si:
- Usuario recarga `/ventas/nueva` mientras está offline (F5, navegación dura):
  el server no responde y el HTML no se cachea por defecto.

**Cómo se comunica al usuario:**
- Banner permanente en el form offline avisa "No recargues la página estando
  offline".
- El banner general de "Modo offline" también queda visible en el layout.

**Mejora futura (out of scope ahora):**
- Opción A: convertir `/ventas/nueva` a Client Component que lea de Dexie
  cuando offline. Más invasivo, afecta el flow online testeado.
- Opción B: PWA runtime caching de la página HTML con stale-while-revalidate.
- Opción C: pantalla dedicada `/ventas/offline` que solo renderiza offline.

Para go-live actual, la limitación es aceptable: el operador trabaja desde
una pestaña abierta, y los cortes de red breves no implican recarga.

## 13. Riesgo CERO de regresión

**Garantía:** mientras `OFFLINE_MODE_ENABLED=false`:
- Nada de IndexedDB se inicializa (Dexie no se importa hasta que el flag está activo).
- `<OfflineBanner>` y `<OfflineGuard>` retornan `null` en su primer render sin tocar hooks de conectividad.
- Las API routes nuevas retornan 404.
- Las server actions nuevas retornan error si se invocan (no deberían — el cliente nunca las llama).
- El form de venta usa exclusivamente el camino actual.
- El Service Worker se registra y cachea assets estáticos (mejora performance), pero no intercepta requests críticos.

Vercel deploy con `OFFLINE_MODE_ENABLED=false` (default): **el sistema no cambia.** Activación del flag en `vercel env` cuando el cliente lo aprueba en una segunda fase.

---

## Apéndice — Decisiones que requieren tu OK final

1. **TTL de reserva: 24h.** Confirmá.
2. **Default cantidad de reserva: 20 números por batch.** Confirmá.
3. **Multi-dispositivo: lock duro** (bloquea segundo dispositivo). Alternativa: warning sin bloqueo. **Recomiendo lock duro.**
4. **`@ducanh2912/next-pwa`** como librería PWA. **Recomiendo.**
5. **Dexie.js v4.** **Recomiendo.**
6. **Iconos de PWA (`icon-192.png`, `icon-512.png`):** placeholders generados por mí, o me los pasás vos. **Para ir rápido sugiero placeholders por ahora, los reemplazás luego.**
7. **Pantalla `/ventas/pendientes`:** ¿la incluyo o se puede acceder solo vía `/ventas/sincronizar`? Spec lo menciona en F5 y luego en F6. **Sugiero solo `/ventas/sincronizar` con tab para "Pendientes" y "Sincronizadas (últimas 24h)".**

---

**Esperando tu OK general + las 7 decisiones de arriba para pasar a Fase 2 (Schema + Backend).**
