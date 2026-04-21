import { prisma } from "@/lib/prisma"
import { UnidadesList } from "./UnidadesList"

export const dynamic = "force-dynamic"

export default async function UnidadesPage() {
  const unidades = await prisma.unidadMedida.findMany({
    orderBy: { nombre: "asc" },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Unidades de Medida</h1>
        <p className="text-sm text-slate-500">Kilogramos, cajones, bolsas, etc.</p>
      </div>
      <UnidadesList unidades={unidades} />
    </div>
  )
}
