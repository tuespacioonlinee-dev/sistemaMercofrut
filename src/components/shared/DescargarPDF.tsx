"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Props {
  href: string
  label?: string
}

export function DescargarPDF({ href, label = "Exportar PDF" }: Props) {
  const [descargando, setDescargando] = useState(false)

  async function handleClick() {
    setDescargando(true)
    try {
      const res = await fetch(href)
      if (!res.ok) throw new Error("Error al generar el PDF")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = href.split("/").pop() + ".pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("No se pudo generar el PDF. Intentá de nuevo.")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={descargando}>
      {descargando
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
        : <><FileDown className="h-4 w-4 mr-2" />{label}</>
      }
    </Button>
  )
}
