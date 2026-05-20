/**
 * Renombra el nombreFantasia (y opcionalmente razonSocial / localidad) del
 * ParametrosNegocio actual. Útil cuando hay que rebrandear un cliente sin
 * que el dueño tenga que ir a la UI a editarlo.
 *
 * Uso:
 *   NUEVO_NOMBRE_FANTASIA="JDC Mercofrut" npx tsx prisma/scripts/rename-empresa.ts
 *
 *   NUEVO_NOMBRE_FANTASIA="JDC Mercofrut" \
 *   NUEVA_RAZON_SOCIAL="JDC Developers SRL" \
 *   NUEVA_LOCALIDAD="S.M. de Tucumán" \
 *   npx tsx prisma/scripts/rename-empresa.ts
 *
 * Apuntar a producción (cuidado):
 *   DATABASE_URL=...prod-url... NUEVO_NOMBRE_FANTASIA="JDC Mercofrut" \
 *   npx tsx prisma/scripts/rename-empresa.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const nombreFantasia = process.env.NUEVO_NOMBRE_FANTASIA
  const razonSocial    = process.env.NUEVA_RAZON_SOCIAL
  const localidad      = process.env.NUEVA_LOCALIDAD

  if (!nombreFantasia && !razonSocial && !localidad) {
    console.error("Nada para cambiar. Pasá NUEVO_NOMBRE_FANTASIA y/o NUEVA_RAZON_SOCIAL y/o NUEVA_LOCALIDAD.")
    process.exit(1)
  }

  const existente = await prisma.parametrosNegocio.findFirst()
  if (!existente) {
    console.error("No hay ParametrosNegocio cargado en esta DB. Corré primero `npm run seed`.")
    process.exit(1)
  }

  console.log("Antes:")
  console.log(`  nombreFantasia: ${existente.nombreFantasia}`)
  console.log(`  razonSocial:    ${existente.razonSocial}`)
  console.log(`  localidad:      ${existente.localidad}`)

  const data: Record<string, string> = {}
  if (nombreFantasia) data.nombreFantasia = nombreFantasia
  if (razonSocial)    data.razonSocial    = razonSocial
  if (localidad)      data.localidad      = localidad

  const actualizado = await prisma.parametrosNegocio.update({
    where: { id: existente.id },
    data,
  })

  console.log("\nDespués:")
  console.log(`  nombreFantasia: ${actualizado.nombreFantasia}`)
  console.log(`  razonSocial:    ${actualizado.razonSocial}`)
  console.log(`  localidad:      ${actualizado.localidad}`)
  console.log("\nListo. El cambio se ve inmediato en login + dashboard + PDFs.")
}

main()
  .catch((e) => {
    console.error("Error:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
