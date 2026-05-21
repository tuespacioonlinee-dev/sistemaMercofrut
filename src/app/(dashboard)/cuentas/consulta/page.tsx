import { ConsultaCuenta } from "./ConsultaCuenta"
import { OfflineGuard } from "@/components/shared/OfflineGuard"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function ConsultaCtaCtePageWrapper() {
  return (
    <OfflineGuard motivo="La consulta de cuenta corriente lee datos en vivo del servidor.">
      <div className="space-y-5">
        <div className="flex items-center gap-3" data-no-print>
          <Link
            href="/cuentas"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Cuentas corrientes
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Consulta de Cuenta Corriente</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Buscá un cliente o proveedor para ver sus movimientos
            </p>
          </div>
        </div>

        <ConsultaCuenta />
      </div>
    </OfflineGuard>
  )
}
