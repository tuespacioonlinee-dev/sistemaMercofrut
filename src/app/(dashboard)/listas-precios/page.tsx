import { obtenerListasPrecios } from "@/server/actions/listas-precios"
import { ListasPreciosList } from "./ListasPreciosList"

export const dynamic = "force-dynamic"

export default async function ListasPreciosPage() {
  const listas = await obtenerListasPrecios()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Listas de precios</h1>
        <p className="text-sm text-slate-500">
          Definí precios diferenciados por tipo de cliente (mayorista, minorista, especiales).
          Cada cliente puede tener una lista asignada; si no, se usa la lista marcada como predeterminada
          y como último fallback el precio base de cada producto.
        </p>
      </div>
      <ListasPreciosList listas={listas} />
    </div>
  )
}
