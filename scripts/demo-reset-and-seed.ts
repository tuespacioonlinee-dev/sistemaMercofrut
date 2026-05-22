/**
 * Entry point del seed de demo profesional para Mercofrut.
 *
 * Flujo:
 *   1. parseArgs (--confirm, --admin-email, --dias)
 *   2. Sanity check de la DB (URL, admin existe)
 *   3. SI NO HAY --confirm → dry-run: imprime plan, salir.
 *   4. SI HAY --confirm:
 *      a. cleanup en TX
 *      b. seed catálogo en TX
 *      c. seed cuentas corrientes en TX
 *      d. seed operación en N TXs (una por día)
 *      e. verificación final + imprimir informe
 *
 * Uso:
 *   # Dry-run (no toca DB):
 *   npx dotenv -e .env.local -- npx tsx scripts/demo-reset-and-seed.ts
 *
 *   # Ejecución real:
 *   npx dotenv -e .env.local -- npx tsx scripts/demo-reset-and-seed.ts --confirm
 */
import { PrismaClient } from "@prisma/client"
import { parseArgs } from "./demo-seed/args"
import { cleanup } from "./demo-seed/cleanup"
import { seedCatalogo, seedCuentasCorrientes } from "./demo-seed/seed-catalogo"
import { seedOperacion } from "./demo-seed/seed-operacion"
import { verificar, imprimirInforme } from "./demo-seed/verificacion"
import { PROVEEDORES } from "./demo-seed/data/proveedores"
import { CLIENTES } from "./demo-seed/data/clientes"
import { PRODUCTOS } from "./demo-seed/data/productos"
import { esCUITValido } from "./demo-seed/helpers-cuit"

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  // ────────────────────────────────────────────────────────────────
  // Sanity checks de los datasets antes de tocar la DB
  // ────────────────────────────────────────────────────────────────
  const cuitsInvalidos: string[] = []
  // Proveedores: todos tienen CUIT (proveedor siempre RI/MT, persona jurídica o física).
  for (const p of PROVEEDORES) {
    if (!esCUITValido(p.documento)) {
      cuitsInvalidos.push(`${p.nombreRazonSocial}: ${p.documento}`)
    }
  }
  // Clientes: solo validamos CUIT cuando tipoDocumento === "CUIT".
  for (const c of CLIENTES) {
    if (c.tipoDocumento === "CUIT" && !esCUITValido(c.documento)) {
      cuitsInvalidos.push(`${c.nombreRazonSocial}: ${c.documento}`)
    }
  }
  if (cuitsInvalidos.length > 0) {
    console.error("✗ CUITs inválidos detectados en los datasets:")
    for (const c of cuitsInvalidos) console.error(`   · ${c}`)
    process.exit(1)
  }

  // ────────────────────────────────────────────────────────────────
  // Detección de entorno + warning de prod
  // ────────────────────────────────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL ?? ""
  const esTestingBranch = /testing/i.test(dbUrl) || /\.test\./.test(dbUrl)
  const dbHostPista = dbUrl.match(/@([^/?]+)/)?.[1] ?? "(no parseable)"

  console.log("╔═════════════════════════════════════════════════════════════════╗")
  console.log("║          SEED DEMO MERCOFRUT — Reset + Datos profesionales      ║")
  console.log("╚═════════════════════════════════════════════════════════════════╝")
  console.log("")
  console.log(`DB host:           ${dbHostPista}`)
  console.log(`Branch de testing: ${esTestingBranch ? "SÍ ⚠️" : "NO (producción)"}`)
  console.log(`Modo:              ${args.confirm ? "EJECUCIÓN REAL (--confirm)" : "DRY-RUN (sin --confirm)"}`)
  console.log(`Días a sembrar:    ${args.dias}`)
  console.log(`Admin email:       ${args.adminEmail ?? "(preservar TODOS los admins)"}`)
  console.log("")

  // ────────────────────────────────────────────────────────────────
  // Plan del dry-run
  // ────────────────────────────────────────────────────────────────
  if (!args.confirm) {
    console.log("───── PLAN ─────────────────────────────────────────────────────")
    console.log("")
    console.log("Se BORRARÁN:")
    console.log("  · Todas las Notas de Crédito/Débito + sus líneas")
    console.log("  · Todas las Facturas y Remitos")
    console.log("  · Todos los DetalleVenta y DetalleCompra")
    console.log("  · Todas las Ventas y Compras")
    console.log("  · Todos los Movimientos (Stock, Caja, Cuenta)")
    console.log("  · Todas las Cajas Diarias")
    console.log("  · Todas las Cuentas (CC y CONTADO)")
    console.log("  · Todos los Lotes")
    console.log("  · Todos los ProductoUnidad y PrecioProducto")
    console.log("  · Todos los Productos")
    console.log("  · Todos los Clientes")
    console.log("  · Todos los Proveedores")
    console.log("  · Todas las Listas de Precios")
    console.log("  · Usuarios con rol != ADMIN")
    console.log("  · Tablas offline (si existen): VentaOffline, NumeroComprobanteReservado, DispositivoActivo")
    console.log("")
    console.log("Se RESETEARÁN (no se borran, vuelven a 0):")
    console.log("  · SecuenciaComprobante.ultimoNumero")
    console.log("  · ParametrosComprobante (proximoRemito, proximaFacturaA/B/C)")
    console.log("  · Sequence Postgres de Venta.numero, CajaDiaria.numero")
    console.log("")
    console.log("Se PRESERVARÁN:")
    console.log("  · Usuarios con rol = ADMIN" + (args.adminEmail ? ` (filtrado por ${args.adminEmail})` : " (todos los activos)"))
    console.log("  · ParametrosNegocio")
    console.log("  · Categorías existentes (se upsertean Frutas/Cítricos/Verduras/Hortalizas si faltan)")
    console.log("  · Unidades existentes (se upsertean Kg/Cjn/Bls/Atd/Un si faltan)")
    console.log("")
    console.log("Se CREARÁN:")
    console.log(`  · ${PROVEEDORES.length} proveedores profesionales (códigos 20001-20015)`)
    console.log(`  · ${CLIENTES.length} clientes profesionales (códigos 10001-10015)`)
    console.log(`  · ${PRODUCTOS.length} productos (15 frutas+cítricos, 15 verduras+hortalizas)`)
    console.log(`  · ~${PRODUCTOS.reduce((acc, p) => acc + p.cantidadLotes, 0)} lotes con vencimientos escalonados (5/12/25/40/55 días)`)
    console.log(`  · ${args.dias} días de operación con apertura/cierre de caja cuadrado`)
    console.log(`  · ~${args.dias * 25} ventas (50% contado, 50% CC, distribuidas entre los 15 clientes)`)
    console.log(`  · ~${args.dias * 5} compras a proveedores`)
    console.log(`  · ~${args.dias * 2.5 | 0} cobros y ${args.dias} pagos a proveedor por día`)
    console.log(`  · 3 Notas de Crédito y 2 Notas de Débito repartidas`)
    console.log(`  · ${args.dias} cajas cerradas y cuadradas + 0 cajas abiertas (hoy abrís vos)`)
    console.log("")
    console.log("Para EJECUTAR realmente: agregá --confirm al comando.")
    console.log("")
    return
  }

  // ────────────────────────────────────────────────────────────────
  // Ejecución real
  // ────────────────────────────────────────────────────────────────
  console.log("⚠️  Vas a tocar la DB indicada arriba. CTRL+C en los próximos 5s para abortar.")
  await new Promise((r) => setTimeout(r, 5000))

  const prisma = new PrismaClient()

  try {
    // 1. Sanity: confirmar que el admin existe ANTES de borrar nada.
    const adminFiltro = args.adminEmail
      ? { email: args.adminEmail }
      : { rol: "ADMIN" as const, activo: true }
    const admin = await prisma.usuario.findFirst({
      where: adminFiltro,
      orderBy: { createdAt: "asc" },
    })
    if (!admin) {
      throw new Error(`No se encontró admin con filtro ${JSON.stringify(adminFiltro)}.`)
    }
    if (admin.rol !== "ADMIN" || !admin.activo) {
      throw new Error(`El usuario ${admin.email} no es ADMIN activo (rol=${admin.rol}, activo=${admin.activo}).`)
    }
    console.log(`Admin preservado: ${admin.email} (id ${admin.id})`)

    // 2. Cleanup.
    console.log("")
    console.log("→ Limpieza...")
    const cleanResult = await cleanup(prisma, { adminEmail: args.adminEmail })
    const totalBorrado =
      cleanResult.notas + cleanResult.facturas + cleanResult.remitos +
      cleanResult.detallesVenta + cleanResult.detallesCompra +
      cleanResult.ventas + cleanResult.compras +
      cleanResult.movimientosStock + cleanResult.movimientosCaja + cleanResult.movimientosCuenta +
      cleanResult.cajas + cleanResult.cuentas +
      cleanResult.lotes + cleanResult.precios + cleanResult.productoUnidades +
      cleanResult.productos + cleanResult.clientes + cleanResult.proveedores +
      cleanResult.listasPrecio + cleanResult.usuariosNoAdmin + cleanResult.offlineRows
    console.log(`  Total rows borradas: ${totalBorrado}`)
    console.log(`  Contadores reseteados: ${cleanResult.contadoresReseteados}`)

    // 3. Seed catálogo.
    console.log("")
    console.log("→ Seed catálogo (proveedores, clientes, productos, lotes)...")
    const catalogo = await seedCatalogo(prisma)
    console.log(`  ${catalogo.proveedores} proveedores, ${catalogo.clientes} clientes, ${catalogo.productos} productos, ${catalogo.lotes} lotes`)

    // 4. Seed cuentas corrientes.
    console.log("")
    console.log("→ Seed cuentas corrientes...")
    const cuentas = await seedCuentasCorrientes(prisma, catalogo)
    console.log(`  ${cuentas.cuentaIdPorClienteCodigo.size} cuentas CC clientes, ${cuentas.cuentaIdPorProveedorCodigo.size} cuentas CC proveedores`)

    // 5. Seed operación (N días).
    console.log("")
    console.log(`→ Seed operación (${args.dias} días)...`)
    const opR = await seedOperacion(prisma, catalogo, cuentas, { adminId: admin.id, dias: args.dias })
    console.log(`  ${opR.ventas} ventas, ${opR.compras} compras, ${opR.cobros} cobros, ${opR.pagos} pagos, ${opR.notasCredito} NC, ${opR.notasDebito} ND`)
    console.log(`  ${opR.cajasCerradas} cajas cerradas`)

    // 6. Verificación.
    console.log("")
    console.log("→ Verificación final...")
    const ver = await verificar(prisma)
    imprimirInforme(ver)

    const ok = ver.cuadres.cajasOK && ver.cuadres.stockNoNegativo && ver.cuadres.saldosCuentaOK
    if (!ok) {
      console.error("⚠️  Hay inconsistencias en los cuadres. Revisar el detalle arriba.")
      process.exit(2)
    }
    console.log("✅ Seed completado y verificado. Demo listo.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("")
  console.error("✗ Falló el seed:")
  console.error(err instanceof Error ? err.stack : err)
  process.exit(1)
})
