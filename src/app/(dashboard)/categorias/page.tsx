import { prisma } from "@/lib/prisma"
import { CategoriasList } from "./CategoriasList"

export const dynamic = "force-dynamic"

export default async function CategoriasPage() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
        <p className="text-sm text-slate-500">Organizá tus productos por tipo</p>
      </div>
      <CategoriasList categorias={categorias} />
    </div>
  )
}
