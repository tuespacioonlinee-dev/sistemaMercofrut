import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ComprasTable } from "./ComprasTable"

export const dynamic = "force-dynamic"

export default async function ComprasPage() {
  const compras = await prisma.compra.findMany({
    include: {
      proveedor: { select: { nombreRazonSocial: true } },
      creadaPor: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
          <p className="text-sm text-slate-500">Registro de compras a proveedores</p>
        </div>
        <Link href="/compras/nueva" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva compra
        </Link>
      </div>
      <ComprasTable compras={compras} />
    </div>
  )
}
