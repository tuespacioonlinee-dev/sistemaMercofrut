import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ProductosTable } from "./ProductosTable"

export const dynamic = "force-dynamic"

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({
    include: {
      categoria: { select: { nombre: true } },
      unidadBase: { select: { abreviatura: true } },
    },
    orderBy: { nombre: "asc" },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
          <p className="text-sm text-slate-500">Stock de frutas y verduras</p>
        </div>
        <Link href="/productos/nuevo" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo producto
        </Link>
      </div>
      <ProductosTable productos={productos} />
    </div>
  )
}
