/**
 * Limpieza completa de datos transaccionales + catálogo.
 *
 * Respeta el orden de foreign keys (hijo → padre).
 *
 * NO TOCA:
 *  - Usuarios con rol = 'ADMIN' (filtrados por adminEmail si está seteado, o todos los admins activos)
 *  - ParametrosNegocio (todo)
 *  - Categoría (todas — las upserteamos en seed-catalogo)
 *  - UnidadMedida (todas — idem)
 *  - SecuenciaComprobante (registros se preservan, contadores se resetean a 0)
 *  - ParametrosComprobante (contadores se resetean a 1)
 *
 * SÍ BORRA:
 *  - Todas las tablas transaccionales y de catálogo profesional
 *  - Usuarios no-admin (rol != ADMIN)
 *
 * Optionally limpia tablas offline (DispositivoActivo, NumeroComprobanteReservado,
 * VentaOffline) si existen — vía raw SQL con try/catch silencioso. En main no
 * existen; si Juan mergea PR #4 sí.
 */
import type { PrismaClient } from "@prisma/client"
import { TX_OPCIONES_GRANDES } from "./helpers-prisma"

export interface CleanupResult {
  notas: number
  facturas: number
  remitos: number
  detallesVenta: number
  detallesCompra: number
  ventas: number
  compras: number
  movimientosStock: number
  movimientosCaja: number
  movimientosCuenta: number
  cajas: number
  cuentas: number
  lotes: number
  precios: number
  productoUnidades: number
  productos: number
  clientes: number
  proveedores: number
  listasPrecio: number
  usuariosNoAdmin: number
  /** Tablas offline si existían: cantidad total de rows borradas. */
  offlineRows: number
  /** Counters reseteados (SecuenciaComprobante + ParametrosComprobante). */
  contadoresReseteados: number
}

/** Borra todas las tablas en el orden correcto + resetea contadores. */
export async function cleanup(
  prisma: PrismaClient,
  opts: { adminEmail: string | null },
): Promise<CleanupResult> {
  // Si nos pasaron un email específico, verificamos que ese admin existe
  // antes de tocar nada — si no existe, abortamos para no dejar el sistema
  // sin admin (cuando borremos los no-admin).
  if (opts.adminEmail) {
    const admin = await prisma.usuario.findUnique({
      where: { email: opts.adminEmail },
      select: { id: true, rol: true, activo: true },
    })
    if (!admin) {
      throw new Error(`No se encontró el usuario admin con email ${opts.adminEmail}. Abortando cleanup.`)
    }
    if (admin.rol !== "ADMIN" || !admin.activo) {
      throw new Error(`El usuario ${opts.adminEmail} no es ADMIN activo (rol=${admin.rol}, activo=${admin.activo}). Abortando.`)
    }
  } else {
    const adminsActivos = await prisma.usuario.count({ where: { rol: "ADMIN", activo: true } })
    if (adminsActivos === 0) {
      throw new Error("No hay usuarios ADMIN activos. Abortando cleanup para no dejar el sistema huérfano.")
    }
  }

  return await prisma.$transaction(async (tx) => {
    const r: CleanupResult = {
      notas: 0, facturas: 0, remitos: 0, detallesVenta: 0, detallesCompra: 0,
      ventas: 0, compras: 0, movimientosStock: 0, movimientosCaja: 0,
      movimientosCuenta: 0, cajas: 0, cuentas: 0, lotes: 0, precios: 0,
      productoUnidades: 0, productos: 0, clientes: 0, proveedores: 0,
      listasPrecio: 0, usuariosNoAdmin: 0, offlineRows: 0, contadoresReseteados: 0,
    }

    // 1. Hojas (sin children): notas, facturas, remitos, detalles
    r.notas              = (await tx.lineaNotaCreditoDebito.deleteMany({})).count + (await tx.notaCreditoDebito.deleteMany({})).count
    r.facturas           = (await tx.factura.deleteMany({})).count
    r.remitos            = (await tx.remito.deleteMany({})).count
    r.detallesVenta      = (await tx.detalleVenta.deleteMany({})).count
    r.detallesCompra     = (await tx.detalleCompra.deleteMany({})).count

    // 2. Comprobantes
    r.ventas             = (await tx.venta.deleteMany({})).count
    r.compras            = (await tx.compra.deleteMany({})).count

    // 3. Movimientos
    r.movimientosStock   = (await tx.movimientoStock.deleteMany({})).count
    r.movimientosCaja    = (await tx.movimientoCaja.deleteMany({})).count
    r.movimientosCuenta  = (await tx.movimientoCuenta.deleteMany({})).count

    // 4. Caja y cuentas
    r.cajas              = (await tx.cajaDiaria.deleteMany({})).count
    r.cuentas            = (await tx.cuenta.deleteMany({})).count

    // 5. Productos y derivados
    r.lotes              = (await tx.loteProducto.deleteMany({})).count
    r.precios            = (await tx.precioProducto.deleteMany({})).count
    r.productoUnidades   = (await tx.productoUnidad.deleteMany({})).count
    r.productos          = (await tx.producto.deleteMany({})).count

    // 6. Padres del catálogo comercial
    r.clientes           = (await tx.cliente.deleteMany({})).count
    r.proveedores        = (await tx.proveedor.deleteMany({})).count
    r.listasPrecio       = (await tx.listaPrecio.deleteMany({})).count

    // 7. Usuarios no-admin (y NO el admin elegido si se filtró por email)
    const whereUsuariosNoAdmin = opts.adminEmail
      ? { rol: { not: "ADMIN" as const }, email: { not: opts.adminEmail } }
      : { rol: { not: "ADMIN" as const } }
    r.usuariosNoAdmin    = (await tx.usuario.deleteMany({ where: whereUsuariosNoAdmin })).count

    // 8. Resetear contadores de numeración
    const seqs = await tx.secuenciaComprobante.findMany({ select: { id: true } })
    for (const s of seqs) {
      await tx.secuenciaComprobante.update({ where: { id: s.id }, data: { ultimoNumero: 0 } })
    }
    const params = await tx.parametrosComprobante.findMany({ select: { id: true } })
    for (const p of params) {
      await tx.parametrosComprobante.update({
        where: { id: p.id },
        data: { proximoRemito: 1, proximaFacturaA: 1, proximaFacturaB: 1, proximaFacturaC: 1 },
      })
    }
    r.contadoresReseteados = seqs.length + params.length

    // 9. Resetear sequences de Postgres para Venta.numero y CajaDiaria.numero
    //    (que son autoincrement Int). Sin esto, números arrancarían desde el
    //    último max+1 en vez de 1.
    await tx.$executeRawUnsafe(`ALTER SEQUENCE "Venta_numero_seq" RESTART WITH 1`)
    await tx.$executeRawUnsafe(`ALTER SEQUENCE "CajaDiaria_numero_seq" RESTART WITH 1`)

    // 10. Tablas offline opcionales — solo si existen.
    //     En main no existen (PR #4 abierto). Si existieran, las limpiamos.
    //     IMPORTANTE: en Postgres, una raw query que falla dentro de una
    //     transacción la deja en estado ABORTED → todos los deletes previos
    //     se pierden al commit. Por eso chequeamos existencia ANTES con
    //     information_schema, evitando triggerear un error.
    const offlineTables = ["VentaOffline", "NumeroComprobanteReservado", "DispositivoActivo"]
    for (const t of offlineTables) {
      const existe = await tx.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${t}
        ) AS exists
      `
      if (existe[0]?.exists) {
        const n = await tx.$executeRawUnsafe(`DELETE FROM "${t}"`)
        r.offlineRows += Number(n)
      }
    }

    return r
  }, TX_OPCIONES_GRANDES)
}
