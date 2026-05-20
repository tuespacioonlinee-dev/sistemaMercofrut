import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { obtenerVentaPorId } from "@/server/actions/ventas"
import { emitirNota } from "@/server/actions/notas"
import { FormNota } from "./FormNota"
import type { NotaInput } from "@/lib/validaciones/notas"

interface Props {
  searchParams: Promise<{ ventaId?: string; tipo?: "CREDITO" | "DEBITO" }>
}

export default async function NuevaNotaPage({ searchParams }: Props) {
  const { ventaId, tipo } = await searchParams
  if (!ventaId) notFound()

  const venta = await obtenerVentaPorId(ventaId)
  if (!venta) notFound()

  const tipoNota: "CREDITO" | "DEBITO" = tipo === "DEBITO" ? "DEBITO" : "CREDITO"

  // Pre-cargar líneas desde la venta (editables a la baja en el form).
  const lineasIniciales = venta.detalles.map((d) => ({
    productoId:     d.productoId,
    nombreProducto: d.producto.nombre,
    codigoProducto: d.producto.codigo,
    unidadId:       d.unidadId,
    abrevUnidad:    d.unidad.abreviatura,
    cantidad:       Number(d.cantidad),
    cantidadMax:    Number(d.cantidad),  // tope = cantidad facturada
    precioUnitario: Number(d.precioUnitario),
  }))

  async function accionEmitir(data: NotaInput) {
    "use server"
    return emitirNota(data)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/ventas/${venta.id}`} className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Venta #{String(venta.numero).padStart(5, "0")}
        </Link>
        <span>/</span>
        <span className="text-foreground">
          Nueva nota de {tipoNota === "CREDITO" ? "crédito" : "débito"}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          Nota de {tipoNota === "CREDITO" ? "crédito" : "débito"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-medium">{venta.cliente.nombreRazonSocial}</span> ·
          {" "}Venta origen: #{String(venta.numero).padStart(5, "0")} ·
          {" "}Total venta: <span className="font-medium">${Number(venta.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
        </p>
      </div>

      <FormNota
        tipo={tipoNota}
        ventaId={venta.id}
        lineasIniciales={lineasIniciales}
        onSubmit={accionEmitir}
      />
    </div>
  )
}
