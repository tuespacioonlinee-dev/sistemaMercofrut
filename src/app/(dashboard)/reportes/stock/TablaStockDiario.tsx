"use client"

import { useState, createElement } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ReporteHeader } from "../_components/ReporteHeader"
import { useExportPDF } from "../_components/useExportPDF"
import type { CajaParaReporte, FilaStockDiario } from "@/server/actions/reportes"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n === 0) return <span className="text-muted-foreground/40">—</span>
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}
function fmtTotal(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}

// ─── Column helper ────────────────────────────────────────────────────────────
const col = createColumnHelper<FilaStockDiario>()

function numCol<K extends keyof FilaStockDiario>(
  id: K,
  header: string,
  className?: string,
) {
  return col.accessor(id, {
    header,
    cell: (info) => {
      const n = info.getValue() as number
      return <span className={cn("tabular-nums", className)}>{fmt(n)}</span>
    },
    footer: (info) => {
      const total = info.table
        .getFilteredRowModel()
        .rows.reduce((acc, row) => acc + ((row.getValue(id as string) as number) || 0), 0)
      return (
        <span className={cn("tabular-nums font-semibold", className)}>
          {fmtTotal(total)}
        </span>
      )
    },
  })
}

// ─── Definición de columnas ───────────────────────────────────────────────────
const columns = [
  col.accessor("codigo", {
    header: "ID",
    cell:   (i) => <span className="font-mono text-xs">{i.getValue() ?? "—"}</span>,
    footer: () => <span className="font-semibold text-xs">Totales</span>,
  }),
  col.accessor("descripcion", {
    header: "Descripcion",
    cell:   (i) => <span className="font-medium">{i.getValue()}</span>,
    footer: () => null,
  }),
  col.accessor("presentacion", {
    header:  "Presentacion",
    footer: () => null,
  }),
  numCol("stockInicial", "Inicial"),
  col.group({
    id:      "egresos",
    header:  "EGRESOS",
    columns: [
      numCol("egresosVta",      "Vta",      "text-red-700"),
      numCol("egresosMerma",    "Merma",    "text-red-700"),
      numCol("egresosFaltante", "Faltante", "text-red-700"),
      numCol("egresosSobra",    "Sobra",    "text-red-700"),
      numCol("egresosOtros",    "Otros",    "text-red-700"),
    ],
  }),
  col.group({
    id:      "ingresos",
    header:  "INGRESOS",
    columns: [
      numCol("ingresosCompra",   "Compra",  "text-blue-700"),
      numCol("ingresosMerma",    "Merma",   "text-blue-700"),
      numCol("ingresosFaltante", "Faltante","text-blue-700"),
      numCol("ingresosSobrante", "Sobrant", "text-blue-700"),
      numCol("ingresosOtro",     "Otro",    "text-blue-700"),
    ],
  }),
  numCol("stockFinal", "Final"),
] as ColumnDef<FilaStockDiario>[]

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  caja:  CajaParaReporte
  filas: FilaStockDiario[]
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function TablaStockDiario({ caja, filas }: Props) {
  const [sorting, setSorting]           = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const { exportar, isGenerating }      = useExportPDF()

  const table = useReactTable({
    data:                 filas,
    columns,
    state:                { sorting, globalFilter },
    onSortingChange:      setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel:      getCoreRowModel(),
    getSortedRowModel:    getSortedRowModel(),
    getFilteredRowModel:  getFilteredRowModel(),
  })

  async function handlePDF() {
    const { StockDiarioPDF } = await import("./StockDiarioPDF")
    const filtradas = table.getFilteredRowModel().rows.map((r) => r.original)
    await exportar(
      createElement(StockDiarioPDF, { caja, filas: filtradas }),
      `stock-diario-caja-${caja.numero}.pdf`,
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con botones */}
      <ReporteHeader
        titulo="Reporte Diario de Stock"
        subtitulo={`${filas.length} productos · Caja N° ${caja.numero}`}
        caja={caja}
        onDescargarPDF={handlePDF}
        isGeneratingPDF={isGenerating}
      />

      {/* Filtro global */}
      <div className="flex items-center gap-2 max-w-xs" data-no-print>
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Buscar producto…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs min-w-[1100px]">
          <thead>
            {table.getHeaderGroups().map((hg, rowIdx) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const isEgresos  = header.id === "egresos"
                  const isIngresos = header.id === "ingresos"
                  const isGroup    = isEgresos || isIngresos
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "px-2 py-1.5 text-left font-semibold select-none whitespace-nowrap",
                        rowIdx === 0 && isGroup   && "text-center",
                        isEgresos                 && "bg-red-100 text-red-800",
                        isIngresos                && "bg-blue-100 text-blue-800",
                        !isGroup && rowIdx === 0  && "bg-muted/50",
                        rowIdx === 1              && "bg-muted/30 text-muted-foreground",
                        header.isPlaceholder      && "bg-muted/30",
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() && !isGroup
                              ? "cursor-pointer hover:text-foreground"
                              : "",
                            rowIdx === 0 && isGroup && "justify-center",
                          )}
                          onClick={
                            !isGroup
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {!isGroup && header.column.getCanSort() && (
                            <span className="text-muted-foreground">
                              {header.column.getIsSorted() === "asc"  ? <ArrowUp    className="h-3 w-3" />
                              : header.column.getIsSorted() === "desc" ? <ArrowDown  className="h-3 w-3" />
                              :                                           <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={99}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Sin productos para esta caja.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/10",
                    i % 2 === 0 ? "bg-background" : "bg-muted/5",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          <tfoot className="border-t-2 bg-muted/20">
            {table.getFooterGroups().map((fg) => (
              <tr key={fg.id}>
                {fg.headers.map((header) => (
                  <th key={header.id} className="px-2 py-1.5 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </div>
  )
}
