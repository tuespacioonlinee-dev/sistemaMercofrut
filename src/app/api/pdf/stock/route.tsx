import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { StockPDF } from "@/components/pdf/StockPDF"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function GET() {
  const session = await auth()
  if (!session) return new Response("No autorizado", { status: 401 })

  const productos = await prisma.producto.findMany({
    where: { activo: true, deletedAt: null },
    select: {
      codigo: true,
      nombre: true,
      stockTotal: true,
      stockMinimo: true,
      precioCompra: true,
      categoria: { select: { nombre: true } },
      unidadBase: { select: { abreviatura: true } },
    },
    orderBy: { nombre: "asc" },
  })

  const items = productos.map((p) => {
    const stock = Number(p.stockTotal)
    const minimo = Number(p.stockMinimo)
    const precioCompra = Number(p.precioCompra)
    return {
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria.nombre,
      stock,
      unidad: p.unidadBase.abreviatura,
      precioCompra,
      valorStock: stock * precioCompra,
      bajoMinimo: minimo > 0 && stock <= minimo,
      sinStock: stock === 0,
    }
  })

  const totalValorizado = items.reduce((acc, i) => acc + i.valorStock, 0)
  const fechaStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
  const filename = `stock-${format(new Date(), "yyyy-MM-dd")}.pdf`

  const buffer = await renderToBuffer(
    <StockPDF items={items} totalValorizado={totalValorizado} fecha={fechaStr} />
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
