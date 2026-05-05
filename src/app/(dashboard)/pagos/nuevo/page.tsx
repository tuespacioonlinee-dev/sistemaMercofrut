import { obtenerCuentasProveedores } from "@/server/actions/cuentas"
import { FormPago } from "./FormPago"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  searchParams: Promise<{ cuentaId?: string }>
}

export default async function NuevoPagoPage({ searchParams }: Props) {
  const { cuentaId } = await searchParams
  const cuentas = await obtenerCuentasProveedores()

  const cuentasSerializadas = cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    saldo: Number(c.saldo),
    proveedor: c.proveedor,
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/cuentas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Cuentas corrientes
        </Link>
        <span>/</span>
        <span className="text-foreground">Registrar pago</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Registrar pago a proveedor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registrá un pago a proveedor sobre su cuenta corriente
        </p>
      </div>

      <FormPago cuentas={cuentasSerializadas} preseleccionId={cuentaId} />
    </div>
  )
}
