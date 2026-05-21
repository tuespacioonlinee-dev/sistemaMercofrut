import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { obtenerClientes } from "@/server/actions/clientes"
import { prisma } from "@/lib/prisma"
import { FormVentaSwitch } from "./FormVentaSwitch"
import { crearVenta } from "@/server/actions/ventas"
import { VentaInput } from "@/lib/validaciones/ventas"

export default async function NuevaVentaPage() {
  const [clientesRaw, productosRaw, unidades] = await Promise.all([
    obtenerClientes(),
    prisma.producto.findMany({
      where: { activo: true, deletedAt: null },
      include: { unidadBase: true, unidadesAlternativas: { include: { unidad: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.unidadMedida.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }),
  ])

  // Proyección mínima para el Client Component — evita pasarle Decimals
  // (maxCredito, saldoInicial) que React 19 advierte como no serializables.
  const clientes = clientesRaw.map((c) => ({
    id:                c.id,
    nombreRazonSocial: c.nombreRazonSocial,
    documento:         c.documento,
  }))

  // Convertir Decimal a number para poder pasarlos al Client Component
  const productos = productosRaw.map((p) => ({
    ...p,
    precioVenta: Number(p.precioVenta),
    precioCompra: Number(p.precioCompra),
    stockTotal: Number(p.stockTotal),
    stockMinimo: Number(p.stockMinimo),
    unidadesAlternativas: p.unidadesAlternativas.map((ua) => ({
      ...ua,
      factor: Number(ua.factor),
    })),
  }))

  async function accionCrear(data: VentaInput) {
    "use server"
    return crearVenta(data)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ventas" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Ventas
        </Link>
        <span>/</span>
        <span className="text-foreground">Nueva venta</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nueva venta</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná el cliente, agregá los productos y confirmá la venta.
        </p>
      </div>

      <FormVentaSwitch
        clientes={clientes}
        productos={productos}
        unidades={unidades}
        onSubmit={accionCrear}
      />
    </div>
  )
}
