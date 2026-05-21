import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PantallaSync } from "./PantallaSync"

export default function VentasSincronizarPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground">Sincronización offline</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Sincronización de ventas offline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisá y confirmá las ventas que cargaste sin conexión.
        </p>
      </div>

      <PantallaSync />
    </div>
  )
}
