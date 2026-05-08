"use client"

import { Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CajaHeaderInfo {
  numero: number
  estado: "ABIERTA" | "CERRADA"
  fechaApertura: string
  fechaCierre?: string | null
}

interface Props {
  titulo: string
  subtitulo?: string
  caja?: CajaHeaderInfo
  onDescargarPDF?: () => void
  isGeneratingPDF?: boolean
  className?: string
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReporteHeader({
  titulo,
  subtitulo,
  caja,
  onDescargarPDF,
  isGeneratingPDF = false,
  className,
}: Props) {
  const ahora = new Date().toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {subtitulo && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Generado el {ahora}</p>
      </div>

      {/* Caja + botones */}
      <div className="flex flex-col items-end gap-3">
        {caja && (
          <div className="text-right text-sm">
            <p className="font-semibold">
              Caja N°&nbsp;{caja.numero}
              &nbsp;·&nbsp;
              <span
                className={cn(
                  "font-medium",
                  caja.estado === "ABIERTA" ? "text-green-600" : "text-muted-foreground",
                )}
              >
                {caja.estado}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtFecha(caja.fechaApertura)}
              {caja.fechaCierre && <> → {fmtFecha(caja.fechaCierre)}</>}
            </p>
          </div>
        )}

        <div className="flex gap-2" data-no-print>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimir
          </Button>
          {onDescargarPDF && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDescargarPDF}
              disabled={isGeneratingPDF}
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              {isGeneratingPDF ? "Generando…" : "PDF"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
