import { obtenerCajasParaSelector, obtenerReporteStockResumido } from "@/server/actions/reportes"
import { TablaStockResumido } from "./TablaStockResumido"
import { SelectorCaja } from "../stock/SelectorCaja"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ cajaId?: string }>
}

export default async function ReporteStockResumidoPage({ searchParams }: Props) {
  const { cajaId } = await searchParams

  const [cajas, reporte] = await Promise.all([
    obtenerCajasParaSelector(),
    obtenerReporteStockResumido(cajaId),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3" data-no-print>
        <Link
          href="/reportes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>

        {cajas.length > 0 && reporte && (
          <SelectorCaja cajas={cajas} cajaIdActual={reporte.caja.id} />
        )}
      </div>

      {!reporte ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Sin cajas registradas</p>
          <p className="text-sm mt-1">
            Abrí una caja desde Caja diaria para ver el reporte.
          </p>
        </div>
      ) : (
        <TablaStockResumido caja={reporte.caja} filas={reporte.filas} />
      )}
    </div>
  )
}
