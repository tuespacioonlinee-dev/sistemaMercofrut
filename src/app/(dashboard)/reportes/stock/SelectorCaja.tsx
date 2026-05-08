"use client"

import { useRouter } from "next/navigation"
import type { CajaParaReporte } from "@/server/actions/reportes"

interface Props {
  cajas:        CajaParaReporte[]
  cajaIdActual: string
}

export function SelectorCaja({ cajas, cajaIdActual }: Props) {
  const router = useRouter()

  function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <div className="flex items-center gap-2 text-sm" data-no-print>
      <label className="text-muted-foreground font-medium shrink-0">Caja:</label>
      <select
        value={cajaIdActual}
        onChange={(e) =>
          router.push(`/reportes/stock?cajaId=${e.target.value}`)
        }
        className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {cajas.map((c) => (
          <option key={c.id} value={c.id}>
            N° {c.numero} · {fmtFecha(c.fechaApertura)} ·{" "}
            {c.estado === "ABIERTA" ? "✓ Abierta" : "Cerrada"} ·{" "}
            {c.abiertaPorNombre}
          </option>
        ))}
      </select>
    </div>
  )
}
