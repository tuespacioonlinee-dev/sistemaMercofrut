import { obtenerListadoClientes } from "@/server/actions/reportes"
import { TablaListadoPersonas } from "../_components/TablaListadoPersonas"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ filtro?: string }>
}

export default async function ReporteClientesPage({ searchParams }: Props) {
  const { filtro } = await searchParams
  const soloConSaldo = filtro === "saldo"

  const filas = await obtenerListadoClientes(soloConSaldo)

  const titulo    = soloConSaldo ? "Clientes con Saldo" : "Listado Alfabético de Clientes"
  const subtitulo = `${filas.length} cliente${filas.length !== 1 ? "s" : ""}${soloConSaldo ? " con saldo pendiente" : ""}`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3" data-no-print>
        <Link href="/reportes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </Link>
        <div className="flex gap-2">
          <Link
            href="/reportes/clientes"
            className={cn(buttonVariants({ variant: !soloConSaldo ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}
          >
            Todos
          </Link>
          <Link
            href="/reportes/clientes?filtro=saldo"
            className={cn(buttonVariants({ variant: soloConSaldo ? "default" : "outline", size: "sm" }), "h-7 px-3 text-xs")}
          >
            Con saldo
          </Link>
        </div>
      </div>

      <TablaListadoPersonas
        titulo={titulo}
        subtitulo={subtitulo}
        filas={filas}
        mostrarSaldoTotal={soloConSaldo}
        pdfFilename={soloConSaldo ? "clientes-con-saldo.pdf" : "clientes.pdf"}
      />
    </div>
  )
}
