"use client"

import { Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CajaHeaderInfo {
  numero:       number
  estado:       "ABIERTA" | "CERRADA"
  fechaApertura:string
  fechaCierre?: string | null
}

export interface ReporteHeaderProps {
  titulo:           string
  subtitulo?:       string
  /** Info de caja opcional — aparece a la derecha del título */
  caja?:            CajaHeaderInfo
  /** Callback que se llama al hacer clic en "PDF" */
  onDescargarPDF?:  () => void
  isGeneratingPDF?: boolean
  className?:       string
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/**
 * Encabezado reutilizable para reportes.
 * Muestra título, subtítulo, fecha de generación y botones Imprimir / PDF.
 * El atributo `data-no-print` oculta los botones al imprimir (ver globals.css).
 */
export function ReporteHeader({
  titulo,
  subtitulo,
  caja,
  onDescargarPDF,
  isGeneratingPDF = false,
  className,
}: ReporteHeaderProps) {
  const ahora = new Date().toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      {/* Título + subtítulo + fecha */}
      <div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {subtitulo && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Generado el {ahora}</p>
      </div>

      {/* Info de caja + botones */}
      <div className="flex flex-col items-end gap-3">
        {caja && (
          <div className="text-right text-sm">
            <p className="font-semibold">
              Caja N°&nbsp;{caja.numero}&nbsp;·&nbsp;
              <span className={cn(
                "font-medium",
                caja.estado === "ABIERTA" ? "text-green-600" : "text-muted-foreground",
              )}>
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
          <Button variant="outline" size="sm" onClick={() => window.print()}>
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
