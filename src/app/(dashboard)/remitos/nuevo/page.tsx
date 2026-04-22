import { obtenerVentasParaRemito } from "@/server/actions/remitos"
import { formatearPesos } from "@/lib/utils"
import { FormNuevoRemito } from "./FormNuevoRemito"

export const dynamic = "force-dynamic"

export default async function NuevoRemitoPage() {
  const ventasRaw = await obtenerVentasParaRemito()

  const ventas = ventasRaw.map((v) => ({
    id: v.id,
    numero: v.numero,
    fecha: v.fecha.toISOString(),
    total: Number(v.total),
    condicion: v.condicion,
    cliente: { nombreRazonSocial: v.cliente.nombreRazonSocial },
    remitosCount: v.remitos.length,
    detalles: v.detalles.map((d) => ({
      id: d.id,
      cantidad: Number(d.cantidad),
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.subtotal),
      producto: { nombre: d.producto.nombre },
      unidad: { abreviatura: d.unidad.abreviatura },
    })),
  }))

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Nuevo remito</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná una venta para emitir el remito de entrega
        </p>
      </div>

      <FormNuevoRemito ventas={ventas} />
    </div>
  )
}
