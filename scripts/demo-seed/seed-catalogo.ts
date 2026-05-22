/**
 * Seed del catálogo comercial:
 *  - Upsert categorías y unidades (no las borramos, solo agregamos faltantes)
 *  - 15 proveedores
 *  - 15 clientes (sin cuentas CC todavía — las crea el seed de operación)
 *  - 30 productos con su categoría + unidad base
 *  - Lotes con vencimientos escalonados para perecederos
 *
 * Stock inicial: TODOS los productos arrancan en 0. El stock se construye
 * a partir de las compras del seed de operación, garantizando coherencia
 * con MovimientoStock.
 */
import { type PrismaClient, type Prisma } from "@prisma/client"
import { TX_OPCIONES_GRANDES, dec, decQty } from "./helpers-prisma"
import { PROVEEDORES } from "./data/proveedores"
import { CLIENTES } from "./data/clientes"
import { PRODUCTOS, CATEGORIAS_REQUERIDAS, UNIDADES_REQUERIDAS } from "./data/productos"

export interface CatalogoResult {
  categoriasCreadasOExistentes: number
  unidadesCreadasOExistentes: number
  proveedores: number
  clientes: number
  productos: number
  lotes: number
  /** Map productCodigo → productoId (para usar en seed-operacion). */
  productoIdPorCodigo: Map<string, string>
  /** Map clienteCodigo → clienteId. */
  clienteIdPorCodigo: Map<string, string>
  /** Map proveedorCodigo → proveedorId. */
  proveedorIdPorCodigo: Map<string, string>
  /** Map productoCodigo → array de lotes (id, fechaVencimiento, cantidadActual). */
  lotesPorProducto: Map<string, Array<{ id: string; fechaVencimiento: Date; cantidadActual: number }>>
  /** Unidad por abreviatura (Kg, Cjn, Bls, Atd, Un). */
  unidadIdPorAbrev: Map<string, string>
}

export async function seedCatalogo(prisma: PrismaClient): Promise<CatalogoResult> {
  return await prisma.$transaction(async (tx) => {
    // ───── Categorías (upsert por nombre) ─────
    const categoriaIdPorNombre = new Map<string, string>()
    for (const nombre of CATEGORIAS_REQUERIDAS) {
      const c = await tx.categoria.upsert({
        where: { nombre },
        update: { activa: true },
        create: { nombre, activa: true },
      })
      categoriaIdPorNombre.set(nombre, c.id)
    }

    // ───── Unidades (upsert por nombre) ─────
    const unidadIdPorAbrev = new Map<string, string>()
    for (const u of UNIDADES_REQUERIDAS) {
      const created = await tx.unidadMedida.upsert({
        where: { nombre: u.nombre },
        update: { activa: true, abreviatura: u.abreviatura },
        create: { nombre: u.nombre, abreviatura: u.abreviatura, activa: true },
      })
      unidadIdPorAbrev.set(u.abreviatura, created.id)
    }

    // ───── Proveedores ─────
    const proveedorIdPorCodigo = new Map<string, string>()
    for (const p of PROVEEDORES) {
      const created = await tx.proveedor.create({
        data: {
          codigo: p.codigo,
          nombreRazonSocial: p.nombreRazonSocial,
          tipoDocumento: "CUIT",
          documento: p.documento,
          condicionIva: p.condicionIva,
          direccion: p.direccion,
          localidad: p.localidad,
          provincia: p.provincia,
          telefono: p.telefono,
          email: p.email,
          saldoInicial: dec(0),
          activo: true,
        },
      })
      proveedorIdPorCodigo.set(p.codigo, created.id)
    }

    // ───── Clientes ─────
    const clienteIdPorCodigo = new Map<string, string>()
    for (const c of CLIENTES) {
      const created = await tx.cliente.create({
        data: {
          codigo: c.codigo,
          nombreRazonSocial: c.nombreRazonSocial,
          tipoDocumento: c.tipoDocumento,
          documento: c.documento,
          condicionIva: c.condicionIva,
          direccion: c.direccion,
          localidad: c.localidad,
          provincia: c.provincia,
          telefono: c.telefono,
          email: c.email,
          maxCredito: c.maxCredito !== null ? dec(c.maxCredito) : null,
          saldoInicial: dec(0),
          activo: true,
        },
      })
      clienteIdPorCodigo.set(c.codigo, created.id)
    }

    // ───── Productos ─────
    const productoIdPorCodigo = new Map<string, string>()
    for (const p of PRODUCTOS) {
      const categoriaId = categoriaIdPorNombre.get(p.categoria)
      const unidadBaseId = unidadIdPorAbrev.get(p.unidadAbrev)
      if (!categoriaId || !unidadBaseId) {
        throw new Error(`Falta categoría '${p.categoria}' o unidad '${p.unidadAbrev}' para producto ${p.codigo}`)
      }
      const created = await tx.producto.create({
        data: {
          codigo: p.codigo,
          nombre: p.nombre,
          categoriaId,
          unidadBaseId,
          precioVenta: dec(p.precioVenta),
          precioCompra: dec(p.precioCompra),
          stockTotal: decQty(0),       // construido por compras del seed de operación
          stockMinimo: decQty(p.stockMinimo),
          controlaVencimiento: p.controlaVencimiento,
          activo: true,
        },
      })
      productoIdPorCodigo.set(p.codigo, created.id)
    }

    // ───── Lotes con vencimientos escalonados ─────
    // Distribución por lote (en días desde hoy):
    //  Lote 1: vence en 5 días     (crítico)
    //  Lote 2: vence en 12 días    (próximo)
    //  Lote 3: vence en 25 días    (próximo)
    //  Lote 4: vence en 40 días    (fresco)
    //  Lote 5: vence en 55 días    (fresco)
    // Cantidad inicial varía 20-100 por lote.
    const lotesPorProducto = new Map<string, Array<{ id: string; fechaVencimiento: Date; cantidadActual: number }>>()
    const venceEnDias = [5, 12, 25, 40, 55]
    let totalLotes = 0
    for (const p of PRODUCTOS) {
      if (!p.controlaVencimiento) continue
      const productoId = productoIdPorCodigo.get(p.codigo)!
      const lotes: Array<{ id: string; fechaVencimiento: Date; cantidadActual: number }> = []
      for (let i = 0; i < p.cantidadLotes; i++) {
        const cantidadInicial = 20 + ((p.codigo.charCodeAt(p.codigo.length - 1) * (i + 1)) % 80)
        const fechaVencimiento = new Date()
        fechaVencimiento.setHours(0, 0, 0, 0)
        fechaVencimiento.setDate(fechaVencimiento.getDate() + venceEnDias[i])

        const numeroLote = `L-${p.codigo}-${String(i + 1).padStart(2, "0")}`
        const lote = await tx.loteProducto.create({
          data: {
            productoId,
            numeroLote,
            fechaIngreso: new Date(),
            fechaVencimiento,
            cantidadInicial: decQty(cantidadInicial),
            cantidadActual: decQty(cantidadInicial),
            activo: true,
          },
        })
        lotes.push({ id: lote.id, fechaVencimiento, cantidadActual: cantidadInicial })
        totalLotes++
      }
      lotesPorProducto.set(p.codigo, lotes)

      // El stock inicial del producto = suma de cantidadActual de sus lotes.
      // Se actualiza acá para que coincida.
      const stockTotal = lotes.reduce((acc, l) => acc + l.cantidadActual, 0)
      await tx.producto.update({
        where: { id: productoId },
        data: { stockTotal: decQty(stockTotal) },
      })
    }

    return {
      categoriasCreadasOExistentes: CATEGORIAS_REQUERIDAS.length,
      unidadesCreadasOExistentes: UNIDADES_REQUERIDAS.length,
      proveedores: PROVEEDORES.length,
      clientes: CLIENTES.length,
      productos: PRODUCTOS.length,
      lotes: totalLotes,
      productoIdPorCodigo,
      clienteIdPorCodigo,
      proveedorIdPorCodigo,
      lotesPorProducto,
      unidadIdPorAbrev,
    }
  }, TX_OPCIONES_GRANDES)
}

/**
 * Crea las cuentas corrientes (una por cliente con maxCredito, una por proveedor)
 * en una TX separada. Se llama desde seed-operacion.
 */
export async function seedCuentasCorrientes(
  prisma: PrismaClient,
  catalogo: CatalogoResult,
): Promise<{ cuentaIdPorClienteCodigo: Map<string, string>; cuentaIdPorProveedorCodigo: Map<string, string> }> {
  const cuentaIdPorClienteCodigo = new Map<string, string>()
  const cuentaIdPorProveedorCodigo = new Map<string, string>()

  await prisma.$transaction(async (tx) => {
    // Cliente CC: solo los que tienen maxCredito (los demás se manejan solo en contado)
    for (const c of CLIENTES) {
      if (c.maxCredito === null) continue
      const clienteId = catalogo.clienteIdPorCodigo.get(c.codigo)!
      const cuenta = await tx.cuenta.create({
        data: {
          nombre: `Cta. Cte. - ${c.nombreRazonSocial}`,
          tipo: "CORRIENTE",
          titular: "CLIENTE",
          clienteId,
          saldo: dec(0),
          activa: true,
        },
      })
      cuentaIdPorClienteCodigo.set(c.codigo, cuenta.id)
    }

    // Proveedor CC: todos (tienen CC por default para compras a crédito)
    for (const p of PROVEEDORES) {
      const proveedorId = catalogo.proveedorIdPorCodigo.get(p.codigo)!
      const cuenta = await tx.cuenta.create({
        data: {
          nombre: `Cta. Cte. - ${p.nombreRazonSocial}`,
          tipo: "CORRIENTE",
          titular: "PROVEEDOR",
          proveedorId,
          saldo: dec(0),
          activa: true,
        },
      })
      cuentaIdPorProveedorCodigo.set(p.codigo, cuenta.id)
    }
  }, TX_OPCIONES_GRANDES)

  return { cuentaIdPorClienteCodigo, cuentaIdPorProveedorCodigo }
}

/** Helper externo: tira a Prisma.Decimal para sumar saldos finales luego. */
export type _DecimalReexport = Prisma.Decimal
