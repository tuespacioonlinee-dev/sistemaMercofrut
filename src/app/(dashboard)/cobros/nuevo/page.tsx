import { obtenerCuentasCorrientes } from "@/server/actions/cuentas"
import { FormCobro } from "./FormCobro"
import { OfflineGuard } from "@/components/shared/OfflineGuard"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  searchParams: Promise<{ cuentaId?: string }>
}

export default async function NuevoCobroPage({ searchParams }: Props) {
  const { cuentaId } = await searchParams
  const cuentas = await obtenerCuentasCorrientes()

  const cuentasSerializadas = cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: Number(c.saldo),
    cliente: c.cliente,
  }))

  return (
    <OfflineGuard motivo="Los cobros requieren validar el saldo del cliente contra el servidor.">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/cuentas" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Cuentas corrientes
          </Link>
          <span>/</span>
          <span className="text-foreground">Registrar cobro</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Registrar cobro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registrá un pago de cliente sobre su cuenta corriente
          </p>
        </div>

        <FormCobro cuentas={cuentasSerializadas} preseleccionId={cuentaId} />
      </div>
    </OfflineGuard>
  )
}
