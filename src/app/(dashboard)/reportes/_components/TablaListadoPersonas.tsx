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
import { cn, formatearPesos } from "@/lib/utils"
import { ReporteHeader } from "./ReporteHeader"
import { useExportPDF } from "./useExportPDF"
import type { FilaListadoPersona } from "@/server/actions/reportes"

// ─── Helpers ─────────────────────────────────────────────────────────────────
const col = createColumnHelper<FilaListadoPersona>()

const columns = [
  col.display({
    id:     "idx",
    header: "#",
    cell:   (info) => (
      <span className="text-muted-foreground tabular-nums text-xs">
        {info.row.index + 1}
      </span>
    ),
    footer: () => null,
  }),
  col.accessor("codigo", {
    header: "Codigo",
    cell:   (i) => <span className="font-mono text-xs">{i.getValue() ?? "—"}</span>,
    footer: () => null,
  }),
  col.accessor("nombre", {
    header: "Nombre",
    cell:   (i) => <span className="font-medium">{i.getValue()}</span>,
    footer: () => <span className="font-semibold text-xs">Saldo Total</span>,
  }),
  col.accessor("cuit", {
    header: "CUIT",
    cell:   (i) => <span className="font-mono text-xs">{i.getValue()}</span>,
    footer: () => null,
  }),
  col.accessor("direccion", {
    header: "Dirección",
    cell:   (i) => i.getValue() ?? <span className="text-muted-foreground">—</span>,
    footer: () => null,
  }),
  col.accessor("provincia", {
    header: "Provincia",
    cell:   (i) => i.getValue() ?? <span className="text-muted-foreground">—</span>,
    footer: () => null,
  }),
  col.accessor("localidad", {
    header: "Localidad",
    cell:   (i) => i.getValue() ?? <span className="text-muted-foreground">—</span>,
    footer: () => null,
  }),
  col.accessor("telefono", {
    header: "Teléfono",
    cell:   (i) => i.getValue() ?? <span className="text-muted-foreground">—</span>,
    footer: () => null,
  }),
  col.accessor("saldo", {
    header: "Saldo",
    cell:   (info) => {
      const s = info.getValue()
      return (
        <span className={cn(
          "tabular-nums font-semibold",
          s > 0 ? "text-destructive" : s < 0 ? "text-green-600" : "text-muted-foreground",
        )}>
          {s !== 0 ? formatearPesos(s) : "—"}
        </span>
      )
    },
    footer: (info) => {
      const total = info.table
        .getFilteredRowModel()
        .rows.reduce((acc, row) => acc + (row.getValue<number>("saldo") || 0), 0)
      return (
        <span className={cn(
          "tabular-nums font-bold",
          total > 0 ? "text-destructive" : total < 0 ? "text-green-600" : "text-muted-foreground",
        )}>
          {formatearPesos(total)}
        </span>
      )
    },
  }),
] as ColumnDef<FilaListadoPersona>[]

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  titulo:            string
  subtitulo?:        string
  filas:             FilaListadoPersona[]
  mostrarSaldoTotal: boolean
  pdfFilename:       string
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function TablaListadoPersonas({
  titulo,
  subtitulo,
  filas,
  mostrarSaldoTotal,
  pdfFilename,
}: Props) {
  const [sorting, setSorting]           = useState<SortingState>([{ id: "nombre", desc: false }])
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
    const { ListadoPersonasPDF } = await import("./ListadoPersonasPDF")
    await exportar(
      createElement(ListadoPersonasPDF, {
        titulo,
        subtitulo,
        filas: table.getFilteredRowModel().rows.map((r) => r.original),
        mostrarSaldoTotal,
      }),
      pdfFilename,
    )
  }

  const totalSaldo = table
    .getFilteredRowModel()
    .rows.reduce((acc, row) => acc + (row.getValue<number>("saldo") || 0), 0)

  return (
    <div className="space-y-4">
      <ReporteHeader
        titulo={titulo}
        subtitulo={subtitulo ?? `${filas.length} registros`}
        onDescargarPDF={handlePDF}
        isGeneratingPDF={isGenerating}
      />

      {/* Resumen (solo cuando hay saldo) */}
      {mostrarSaldoTotal && (
        <div className="inline-block border rounded-lg p-4 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1">Saldo Total</p>
          <p className={cn(
            "text-2xl font-bold",
            totalSaldo > 0 ? "text-destructive" : "text-green-700",
          )}>
            {formatearPesos(totalSaldo)}
          </p>
        </div>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-2 max-w-xs" data-no-print>
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Buscar nombre, CUIT…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Tabla */}
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
                  Sin registros.
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

          {/* Footer con saldo total */}
          {mostrarSaldoTotal && (
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
          )}
        </table>
      </div>
    </div>
  )
}
