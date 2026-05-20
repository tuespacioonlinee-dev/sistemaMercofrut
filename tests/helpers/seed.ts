/**
 * Helpers de seed reutilizables.
 *
 * - `seedBase()`: corre una sola vez en globalSetup. Crea admin + catálogo mínimo.
 * - `seedCajaAbierta()`: deja una caja abierta lista para usar.
 * - `seedClienteConSaldo()`: crea un cliente CC con saldo deudor inicial.
 * - `seedProductoConStock()`: crea producto con stock disponible.
 *
 * Cada test individual llama a `resetTransactional()` + los seeds que necesita.
 */
import bcrypt from "bcryptjs"
import { prismaTest } from "./db"

export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@test.local"
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "admin-test-123"

/**
 * Seed base — corre una sola vez en globalSetup.
 * Idempotente: usa upserts donde es posible.
 */
export async function seedBase() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  await prismaTest.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, activo: true, rol: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      nombre: "Admin Test",
      passwordHash,
      rol: "ADMIN",
      activo: true,
    },
  })

  await prismaTest.categoria.upsert({
    where: { nombre: "General" },
    update: {},
    create: { nombre: "General" },
  })

  await prismaTest.unidadMedida.upsert({
    where: { nombre: "Kilogramo" },
    update: {},
    create: { nombre: "Kilogramo", abreviatura: "Kg" },
  })

  const existeParam = await prismaTest.parametrosComprobante.findFirst()
  if (!existeParam) {
    await prismaTest.parametrosComprobante.create({
      data: { puntoVenta: 1, proximoRemito: 1 },
    })
  }

  const existeNeg = await prismaTest.parametrosNegocio.findFirst()
  if (!existeNeg) {
    await prismaTest.parametrosNegocio.create({
      data: {
        nombreFantasia: "Mercofrut Test",
        razonSocial: "Mercofrut Test S.A.",
        cuit: "30-12345678-9",
        condicionIva: "RESPONSABLE_INSCRIPTO",
        direccion: "Test 123",
        localidad: "Test",
      },
    })
  }
}

/** Devuelve el usuario admin (creado por seedBase). */
export async function obtenerAdmin() {
  const admin = await prismaTest.usuario.findUnique({ where: { email: ADMIN_EMAIL } })
  if (!admin) throw new Error("Admin no encontrado — ¿corrió seedBase?")
  return admin
}

/** Abre una caja para el admin. Devuelve la caja creada. */
export async function seedCajaAbierta(saldoInicial = 0) {
  const admin = await obtenerAdmin()
  return prismaTest.cajaDiaria.create({
    data: {
      saldoInicial,
      abiertaPorId: admin.id,
      estado: "ABIERTA",
    },
  })
}

/**
 * Inserta un MovimientoCaja directo en la caja indicada. Útil para sembrar
 * el estado previo a un cierre sin pasar por todo el flujo de ventas/cobros.
 */
export async function seedMovimientoCaja(opts: {
  cajaId: string
  tipo: "CONTADO_HABER" | "CONTADO_DEBE" | "CC_HABER" | "CC_DEBE"
  categoria:
    | "VENTA_CONTADO" | "COBRO_CLIENTE" | "PAGO_PROVEEDOR"
    | "COMPRA_CONTADO" | "GASTO" | "RETIRO" | "DEPOSITO" | "OTRO"
  monto: number
  descripcion: string
}) {
  const admin = await obtenerAdmin()
  return prismaTest.movimientoCaja.create({
    data: {
      cajaId: opts.cajaId,
      tipo: opts.tipo,
      categoria: opts.categoria,
      monto: opts.monto,
      descripcion: opts.descripcion,
      usuarioId: admin.id,
    },
  })
}

/**
 * Crea un producto con stock disponible.
 * Devuelve también `unidadBase` para que el caller pueda seleccionar la unidad
 * explícitamente en la UI.
 *
 * No crea `ProductoUnidad` alternativa: `crearVenta()` ya aplica factor=1 por
 * defecto cuando el producto/unidad no tiene fila en ProductoUnidad.
 */
export async function seedProductoConStock(opts: {
  codigo: string
  nombre: string
  precioVenta: number
  stock: number
}) {
  const categoria = await prismaTest.categoria.findFirstOrThrow({ where: { nombre: "General" } })
  const unidad = await prismaTest.unidadMedida.findFirstOrThrow({ where: { nombre: "Kilogramo" } })

  const producto = await prismaTest.producto.create({
    data: {
      codigo: opts.codigo,
      nombre: opts.nombre,
      categoriaId: categoria.id,
      unidadBaseId: unidad.id,
      precioVenta: opts.precioVenta,
      stockTotal: opts.stock,
    },
  })

  return { ...producto, unidadBase: unidad }
}

/**
 * Crea un cliente simple sin cuenta asociada (las cuentas las crea
 * `crearVenta()` on-demand la primera vez que el cliente compra).
 */
export async function seedClienteSinSaldo(opts: {
  nombreRazonSocial: string
  documento: string
  condicionIva?: "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTO" | "EXENTO" | "CONSUMIDOR_FINAL" | "NO_RESPONSABLE"
  codigo?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  telefono?: string | null
}) {
  return prismaTest.cliente.create({
    data: {
      nombreRazonSocial: opts.nombreRazonSocial,
      tipoDocumento: "CUIT",
      documento: opts.documento,
      condicionIva: opts.condicionIva ?? "RESPONSABLE_INSCRIPTO",
      codigo: opts.codigo ?? null,
      direccion: opts.direccion ?? null,
      localidad: opts.localidad ?? null,
      provincia: opts.provincia ?? null,
      telefono: opts.telefono ?? null,
    },
  })
}

/** Crea un proveedor sin cuenta (idem seedClienteSinSaldo pero del lado proveedor). */
export async function seedProveedorSinSaldo(opts: {
  nombreRazonSocial: string
  documento: string
  codigo?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  telefono?: string | null
}) {
  return prismaTest.proveedor.create({
    data: {
      nombreRazonSocial: opts.nombreRazonSocial,
      tipoDocumento: "CUIT",
      documento: opts.documento,
      condicionIva: "RESPONSABLE_INSCRIPTO",
      codigo: opts.codigo ?? null,
      direccion: opts.direccion ?? null,
      localidad: opts.localidad ?? null,
      provincia: opts.provincia ?? null,
      telefono: opts.telefono ?? null,
    },
  })
}

/**
 * Crea un proveedor con cuenta CC y saldo (a favor del proveedor, le debemos).
 */
export async function seedProveedorConSaldoCC(opts: {
  nombreRazonSocial: string
  documento: string
  saldoDeudor: number
  codigo?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  telefono?: string | null
}) {
  const admin = await obtenerAdmin()

  const proveedor = await prismaTest.proveedor.create({
    data: {
      nombreRazonSocial: opts.nombreRazonSocial,
      tipoDocumento: "CUIT",
      documento: opts.documento,
      condicionIva: "RESPONSABLE_INSCRIPTO",
      codigo: opts.codigo ?? null,
      direccion: opts.direccion ?? null,
      localidad: opts.localidad ?? null,
      provincia: opts.provincia ?? null,
      telefono: opts.telefono ?? null,
    },
  })

  const cuenta = await prismaTest.cuenta.create({
    data: {
      nombre: `Cta. Cte. - ${opts.nombreRazonSocial}`,
      tipo: "CORRIENTE",
      titular: "PROVEEDOR",
      proveedorId: proveedor.id,
      saldo: opts.saldoDeudor,
    },
  })

  if (opts.saldoDeudor > 0) {
    await prismaTest.movimientoCuenta.create({
      data: {
        cuentaId: cuenta.id,
        tipo: "DEBE",
        monto: opts.saldoDeudor,
        saldoAnterior: 0,
        saldoPosterior: opts.saldoDeudor,
        descripcion: "Saldo inicial (seed)",
        usuarioId: admin.id,
      },
    })
  }

  return { proveedor, cuenta }
}

/**
 * Crea un cliente con una cuenta CC y un saldo deudor inicial.
 * El saldo se siembra con un MovimientoCuenta tipo DEBE para que quede coherente.
 */
export async function seedClienteConSaldoCC(opts: {
  nombreRazonSocial: string
  documento: string
  saldoDeudor: number
  codigo?: string | null
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  telefono?: string | null
}) {
  const admin = await obtenerAdmin()

  const cliente = await prismaTest.cliente.create({
    data: {
      nombreRazonSocial: opts.nombreRazonSocial,
      tipoDocumento: "CUIT",
      documento: opts.documento,
      condicionIva: "RESPONSABLE_INSCRIPTO",
      codigo: opts.codigo ?? null,
      direccion: opts.direccion ?? null,
      localidad: opts.localidad ?? null,
      provincia: opts.provincia ?? null,
      telefono: opts.telefono ?? null,
    },
  })

  const cuenta = await prismaTest.cuenta.create({
    data: {
      nombre: `Cta. Cte. - ${opts.nombreRazonSocial}`,
      tipo: "CORRIENTE",
      titular: "CLIENTE",
      clienteId: cliente.id,
      saldo: opts.saldoDeudor,
    },
  })

  if (opts.saldoDeudor > 0) {
    await prismaTest.movimientoCuenta.create({
      data: {
        cuentaId: cuenta.id,
        tipo: "DEBE",
        monto: opts.saldoDeudor,
        saldoAnterior: 0,
        saldoPosterior: opts.saldoDeudor,
        descripcion: "Saldo inicial deudor (seed)",
        usuarioId: admin.id,
      },
    })
  }

  return { cliente, cuenta }
}
