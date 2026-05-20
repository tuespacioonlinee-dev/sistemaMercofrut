/**
 * Seed inicial de un cliente nuevo.
 *
 * Lee de env vars (ver .env.example sección "Datos del negocio" y "Seed inicial").
 * Es 100% idempotente: se puede correr múltiples veces sin romper datos existentes.
 *
 * Uso:
 *   npm run seed                          (lee de .env actual)
 *   DATABASE_URL=... npm run seed         (override del DB)
 *
 * Lo que crea (si no existe):
 *   1. Usuario administrador inicial
 *   2. ParametrosNegocio (razón social, CUIT, dirección...)
 *   3. ParametrosComprobante (numeración de remitos y facturas)
 *   4. UnidadMedida básicas: kg, un (unidad), bolsa, cajón
 *   5. Categoría "General" para empezar a cargar productos
 */
import { PrismaClient, CondicionIva, RolUsuario } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function env(key: string, fallback?: string): string {
  const v = process.env[key]
  if (v === undefined || v === "") return fallback ?? ""
  return v
}

function envRequired(key: string): string {
  const v = process.env[key]
  if (v === undefined || v === "") {
    throw new Error(`Falta la variable de entorno requerida: ${key}`)
  }
  return v
}

async function seedAdmin() {
  const email    = envRequired("SEED_ADMIN_EMAIL")
  const password = envRequired("SEED_ADMIN_PASSWORD")
  const nombre   = env("SEED_ADMIN_NOMBRE", "Administrador")

  const passwordHash = await bcrypt.hash(password, 10)

  const u = await prisma.usuario.upsert({
    where:  { email },
    update: {},  // no pisar password si ya existe
    create: { email, nombre, passwordHash, rol: RolUsuario.ADMIN },
    select: { email: true, nombre: true },
  })
  console.log(`  Admin:        ${u.nombre} <${u.email}>`)
}

async function seedParametrosNegocio() {
  const existente = await prisma.parametrosNegocio.findFirst()
  if (existente) {
    console.log(`  Negocio:      ya existe (${existente.nombreFantasia})`)
    return
  }

  const condicionEnv = env("NEGOCIO_CONDICION_IVA", "CONSUMIDOR_FINAL")
  const condicionIva = (CondicionIva as Record<string, CondicionIva>)[condicionEnv]
    ?? CondicionIva.CONSUMIDOR_FINAL

  const p = await prisma.parametrosNegocio.create({
    data: {
      nombreFantasia: env("NEXT_PUBLIC_NEGOCIO_NOMBRE", "Mi Empresa"),
      razonSocial:    env("NEGOCIO_RAZON_SOCIAL",      "A completar"),
      cuit:           env("NEGOCIO_CUIT",              "00-00000000-0"),
      condicionIva,
      direccion:      env("NEGOCIO_DIRECCION",         "A completar"),
      localidad:      env("NEGOCIO_LOCALIDAD",         "A completar"),
      telefono:       env("NEGOCIO_TELEFONO")          || null,
      email:          env("NEGOCIO_EMAIL")             || null,
      ingresosBrutos: env("NEGOCIO_INGRESOS_BRUTOS")   || null,
      facturacionHabilitada: false,
    },
    select: { nombreFantasia: true },
  })
  console.log(`  Negocio:      "${p.nombreFantasia}" creado`)
}

async function seedParametrosComprobante() {
  const existente = await prisma.parametrosComprobante.findFirst()
  if (existente) {
    console.log(`  Numeración:   ya existe (PV ${existente.puntoVenta})`)
    return
  }
  await prisma.parametrosComprobante.create({
    data: {
      puntoVenta:      Number(env("NEGOCIO_PUNTO_VENTA", "1")),
      proximoRemito:   1,
      proximaFacturaA: 1,
      proximaFacturaB: 1,
      proximaFacturaC: 1,
    },
  })
  console.log(`  Numeración:   inicializada en 1`)
}

async function seedUnidadesBase() {
  const unidades = [
    { nombre: "Kilogramo", abreviatura: "kg" },
    { nombre: "Unidad",    abreviatura: "un" },
    { nombre: "Bolsa",     abreviatura: "bls" },
    { nombre: "Cajón",     abreviatura: "caj" },
  ]
  let creadas = 0
  for (const u of unidades) {
    const ya = await prisma.unidadMedida.findFirst({
      where: { OR: [{ nombre: u.nombre }, { abreviatura: u.abreviatura }] },
    })
    if (ya) continue
    await prisma.unidadMedida.create({ data: u })
    creadas++
  }
  console.log(`  Unidades:     ${creadas} creadas (${unidades.length - creadas} ya existían)`)
}

async function seedCategoriaBase() {
  const nombre = "General"
  const ya = await prisma.categoria.findFirst({ where: { nombre } })
  if (ya) {
    console.log(`  Categoría:    "General" ya existe`)
    return
  }
  await prisma.categoria.create({ data: { nombre } })
  console.log(`  Categoría:    "General" creada`)
}

async function main() {
  console.log("Iniciando seed…\n")
  await seedParametrosNegocio()
  await seedParametrosComprobante()
  await seedUnidadesBase()
  await seedCategoriaBase()
  await seedAdmin()
  console.log("\nListo. Entrá con las credenciales del admin para completar /parametros.")
}

main()
  .catch((e) => {
    console.error("\nError durante el seed:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
