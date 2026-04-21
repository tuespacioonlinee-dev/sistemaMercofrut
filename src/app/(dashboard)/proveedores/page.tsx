import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ProveedoresTable } from "./ProveedoresTable"

export const dynamic = "force-dynamic"

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({
    orderBy: { nombreRazonSocial: "asc" },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proveedores</h1>
          <p className="text-sm text-slate-500">Tus proveedores de frutas y verduras</p>
        </div>
        <Link href="/proveedores/nuevo" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo proveedor
        </Link>
      </div>
      <ProveedoresTable proveedores={proveedores} />
    </div>
  )
}
