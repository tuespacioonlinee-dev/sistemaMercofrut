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
import type { CajaParaReporte, FilaStockResumido } from "@/server/actions/reportes"

function fmt(n: number) {
  if (n === 0) return <span className="text-muted-foreground/40">—</span>
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}

const col = createColumnHelper<FilaStockResumido>()

function numCol<K extends keyof FilaStockResumido>(
  id: K,
  header: string,
  className?: string,
) {
  return col.accessor(id, {
    header,
    cell: (info) => (
      <span className={cn("tabular-nums", className)}>
        {fmt(info.getValue() as number)}
      </span>
    ),
    footer: (info) => {
      const total = info.table
        .getFilteredRowModel()
        .rows.reduce((acc, row) => acc + ((row.getValue(id as string) as number) || 0), 0)
      return (
        <span className={cn("tabular-nums font-semibold", className)}>
          {total.toLocaleString("es-AR", { maximumFractionDigits: 3 })}
        </span>
      )
    },
  })
}

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
  numCol("stockInicial",  "Inicial"),
  numCol("totalEgresos",  "Total Egresos",  "text-red-700"),
  numCol("totalIngresos", "Total Ingresos", "text-blue-700"),
  numCol("stockFinal",    "Final"),
] as ColumnDef<FilaStockResumido>[]

interface Props { caja: CajaParaReporte; filas: FilaStockResumido[] }

export function TablaStockResumido({ caja, filas }: Props) {
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
    const { StockResumidoPDF } = await import("./StockResumidoPDF")
    await exportar(
      createElement(StockResumidoPDF, {
        caja,
        filas: table.getFilteredRowModel().rows.map((r) => r.original),
      }),
      `stock-resumido-caja-${caja.numero}.pdf`,
    )
  }

  return (
    <div className="space-y-4">
      <ReporteHeader
        titulo="Reporte de Stock Resumido"
        subtitulo={`${filas.length} productos · Caja N° ${caja.numero}`}
        caja={caja}
        onDescargarPDF={handlePDF}
        isGeneratingPDF={isGenerating}
      />

      <div className="flex items-center gap-2 max-w-xs" data-no-print>
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Buscar producto…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-semibold bg-muted/50 select-none whitespace-nowrap"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        header.column.getCanSort()
                          ? "cursor-pointer hover:text-foreground"
                          : "",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground">
                          {header.column.getIsSorted() === "asc"  ? <ArrowUp     className="h-3 w-3" />
                          : header.column.getIsSorted() === "desc" ? <ArrowDown   className="h-3 w-3" />
                          :                                           <ArrowUpDown className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={99} className="px-4 py-8 text-center text-muted-foreground">
                  Sin productos para esta caja.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr key={row.id} className={cn("hover:bg-muted/10", i % 2 !== 0 && "bg-muted/5")}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
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
                  <th key={header.id} className="px-3 py-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.footer, header.getContext())}
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
