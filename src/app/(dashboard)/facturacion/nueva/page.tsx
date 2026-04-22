import { obtenerVentasParaFacturar } from "@/server/actions/facturacion"
import { prisma } from "@/lib/prisma"
import {
  determinarTipoFactura,
  calcularIva,
  etiquetasTipoFactura,
  etiquetasCondicionIva,
} from "@/lib/validaciones/facturacion"
import { FormNuevaFactura } from "./FormNuevaFactura"

export const dynamic = "force-dynamic"

export default async function NuevaFacturaPage() {
  const [ventasRaw, params] = await Promise.all([
    obtenerVentasParaFacturar(),
    prisma.parametrosNegocio.findFirst({
      select: { condicionIva: true, facturacionHabilitada: true },
    }),
  ])

  const condicionEmisor = params?.condicionIva ?? "RESPONSABLE_INSCRIPTO"

  const ventas = ventasRaw.map((v) => {
    const subtotal = Number(v.subtotal) - Number(v.descuento)
    const tipo = determinarTipoFactura(condicionEmisor, v.cliente.condicionIva)
    const iva = calcularIva(subtotal, tipo)
    const totalConIva = subtotal + iva
    const yaFacturada = v.facturas.some((f) => f.estado === "EMITIDA")

    return {
      id: v.id,
      numero: v.numero,
      fecha: v.fecha.toISOString(),
      subtotal,
      iva,
      totalConIva,
      total: Number(v.total),
      condicion: v.condicion,
      yaFacturada,
      tipoFactura: tipo,
      etiquetaTipo: etiquetasTipoFactura[tipo],
      cliente: {
        nombreRazonSocial: v.cliente.nombreRazonSocial,
        condicionIva: v.cliente.condicionIva,
        etiquetaCondicion: etiquetasCondicionIva[v.cliente.condicionIva],
      },
      remitosEmitidos: v.remitos
        .filter((r) => r.estado === "EMITIDO")
        .map((r) => ({ id: r.id, numero: r.numero })),
      detalles: v.detalles.map((d) => ({
        id: d.id,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
        producto: { nombre: d.producto.nombre },
        unidad: { abreviatura: d.unidad.abreviatura },
      })),
    }
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Nueva factura</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná una venta para emitir el comprobante
        </p>
      </div>

      <FormNuevaFactura ventas={ventas} />
    </div>
  )
}
