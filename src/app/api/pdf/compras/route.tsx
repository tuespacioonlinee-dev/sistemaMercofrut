import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ComprasPDF } from "@/components/pdf/ComprasPDF"
import { format, startOfMonth, subMonths } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return new Response("No autorizado", { status: 401 })

  const { searchParams } = new URL(request.url)
  const meses = Math.min(Number(searchParams.get("meses") ?? "1"), 12)
  const desde = startOfMonth(subMonths(new Date(), meses - 1))

  const comprasRaw = await prisma.compra.findMany({
    where: { fecha: { gte: desde } },
    select: {
      fecha: true,
      numeroComprobante: true,
      condicion: true,
      estado: true,
      total: true,
      proveedor: { select: { nombreRazonSocial: true } },
    },
    orderBy: { fecha: "desc" },
  })

  const compras = comprasRaw.map((c) => ({
    fecha: format(new Date(c.fecha), "dd/MM/yyyy", { locale: es }),
    proveedor: c.proveedor.nombreRazonSocial,
    comprobante: c.numeroComprobante,
    condicion: c.condicion,
    total: Number(c.total),
    estado: c.estado,
  }))

  const totalPeriodo = compras.reduce((acc, c) => acc + c.total, 0)
  const periodoLabel = meses === 1
    ? format(new Date(), "MMMM yyyy", { locale: es })
    : `Ultimos ${meses} meses`
  const fechaStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
  const filename = `compras-${format(new Date(), "yyyy-MM")}.pdf`

  const buffer = await renderToBuffer(
    <ComprasPDF compras={compras} periodo={periodoLabel} totalPeriodo={totalPeriodo} fecha={fechaStr} />
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
