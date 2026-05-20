"use client"

import { createElement } from "react"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useExportPDF } from "@/components/shared/useExportPDF"
import { ReportePDF, type ColPDF, type FilaPDF } from "@/components/shared/ReportePDF"

interface LineaPDF {
  producto: string
  unidad:   string
  cantidad: number
  precio:   number
  subtotal: number
}

interface Props {
  numero: string
  tipo: "CREDITO" | "DEBITO"
  fecha: string
  cliente: string
  documento: string
  motivo: string
  montoTotal: number
  lineas: LineaPDF[]
}

const columnas: ColPDF[] = [
  { key: "producto", header: "Producto", width: 220 },
  { key: "unidad",   header: "Unidad",   width: 50  },
  { key: "cantidad", header: "Cant.",    width: 60,  align: "right" },
  { key: "precio",   header: "Precio",   width: 75,  align: "right" },
  { key: "subtotal", header: "Subtotal", width: 90,  align: "right" },
]

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function DescargarNotaPDF(props: Props) {
  const { exportar, isGenerating } = useExportPDF()

  const filas: FilaPDF[] = props.lineas.map((l) => ({
    producto: l.producto,
    unidad:   l.unidad,
    cantidad: l.cantidad.toLocaleString("es-AR", { maximumFractionDigits: 3 }),
    precio:   `$ ${fmt(l.precio)}`,
    subtotal: `$ ${fmt(l.subtotal)}`,
  }))

  async function handle() {
    const titulo = `Nota de ${props.tipo === "CREDITO" ? "Crédito" : "Débito"} ${props.numero}`
    const sub =
      `Cliente: ${props.cliente} (${props.documento})  ·  ` +
      `Fecha: ${new Date(props.fecha).toLocaleDateString("es-AR")}  ·  ` +
      `Motivo: ${props.motivo}  ·  ` +
      `Total: $${fmt(props.montoTotal)}`
    await exportar(
      createElement(ReportePDF, {
        titulo,
        subtitulo: sub,
        columnas,
        filas,
        orientacion: "portrait",
      }),
      `nota-${props.tipo.toLowerCase()}-${props.numero.replace(/\//g, "-")}.pdf`,
    )
  }

  return (
    <Button onClick={handle} disabled={isGenerating} variant="outline" size="sm">
      <FileDown className="h-4 w-4 mr-1.5" />
      {isGenerating ? "Generando…" : "Descargar PDF"}
    </Button>
  )
}
