"use client"

import { useState, useCallback, useTransition, createElement } from "react"
import { Search, User, Building2, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn, formatearPesos } from "@/lib/utils"
import { useExportPDF } from "../../reportes/_components/useExportPDF"
import { buscarPersonas, obtenerMovimientosCtaCte } from "@/server/actions/reportes"
import type { PersonaResumen, FilaMovimientoCuenta, FiltroMovCC } from "@/server/actions/reportes"

// ─── Labels de filtros ────────────────────────────────────────────────────────
const FILTROS: { value: FiltroMovCC; label: string }[] = [
  { value: "TOTALES",      label: "Movimientos Totales de Cta. Cte." },
  { value: "COMPROBANTES", label: "Todos los Comprobantes" },
  { value: "NO_SALDADOS",  label: "Comprobantes No Saldados" },
  { value: "SALDADOS",     label: "Comprobantes Saldados" },
  { value: "PAGOS",        label: "Detalle de Pagos" },
]

// ─── Helpers de formato ───────────────────────────────────────────────────────
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function ConsultaCuenta() {
  // Buscador
  const [query, setQuery]           = useState("")
  const [personas, setPersonas]     = useState<PersonaResumen[]>([])
  const [buscando, startBuscar]     = useTransition()

  // Selección
  const [persona, setPersona]       = useState<PersonaResumen | null>(null)
  const [filtro, setFiltro]         = useState<FiltroMovCC>("TOTALES")
  const [movimientos, setMovimientos] = useState<FilaMovimientoCuenta[]>([])
  const [cargando, startCargar]     = useTransition()

  // PDF
  const { exportar, isGenerating }  = useExportPDF()

  // ── Debounce búsqueda ────────────────────────────────────────────────────
  const handleQuery = useCallback((val: string) => {
    setQuery(val)
    if (val.trim().length < 2) {
      setPersonas([])
      return
    }
    startBuscar(async () => {
      const res = await buscarPersonas(val)
      setPersonas(res)
    })
  }, [])

  // ── Seleccionar persona ──────────────────────────────────────────────────
  function seleccionar(p: PersonaResumen) {
    setPersona(p)
    setPersonas([])
    setQuery(p.nombre)
    cargarMovimientos(p, filtro)
  }

  // ── Cargar movimientos ───────────────────────────────────────────────────
  function cargarMovimientos(p: PersonaResumen, f: FiltroMovCC) {
    if (!p.cuentaId) {
      setMovimientos([])
      return
    }
    startCargar(async () => {
      const res = await obtenerMovimientosCtaCte(p.cuentaId!, f)
      setMovimientos(res)
    })
  }

  function cambiarFiltro(f: FiltroMovCC) {
    setFiltro(f)
    if (persona) cargarMovimientos(persona, f)
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  async function handlePDF() {
    if (!persona) return
    const filtroLabel = FILTROS.find((f) => f.value === filtro)?.label ?? filtro
    const { CtaCtePDF } = await import("./CtaCtePDF")
    await exportar(
      createElement(CtaCtePDF, { persona, filas: movimientos, filtro: filtroLabel }),
      `cta-cte-${persona.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    )
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalDebe  = movimientos.reduce((a, m) => a + m.debe,  0)
  const totalHaber = movimientos.reduce((a, m) => a + m.haber, 0)
  const saldoFinal = movimientos.length > 0
    ? movimientos[movimientos.length - 1].saldoAcumulado
    : (persona?.saldo ?? 0)

  return (
    <div className="space-y-6">

      {/* ── 1. Buscador ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Buscar cliente o proveedor</label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Nombre, CUIT o código…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
          />
          {buscando && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Buscando…
            </span>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {personas.length > 0 && (
          <div className="max-w-md border rounded-lg shadow-sm bg-background divide-y overflow-hidden">
            {personas.map((p) => (
              <button
                key={`${p.tipo}-${p.id}`}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/40 flex items-center justify-between gap-3 transition-colors"
                onClick={() => seleccionar(p)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {p.tipo === "CLIENTE"
                    ? <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                  <span className="font-medium text-sm truncate">{p.nombre}</span>
                  <Badge
                    variant={p.tipo === "CLIENTE" ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {p.tipo === "CLIENTE" ? "Cliente" : "Proveedor"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  {p.cuit}
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Datos de la persona seleccionada ─────────────────────────── */}
      {persona && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {persona.tipo === "CLIENTE"
                  ? <User className="h-4 w-4 text-muted-foreground" />
                  : <Building2 className="h-4 w-4 text-muted-foreground" />
                }
                <span className="font-semibold">{persona.nombre}</span>
                <Badge variant={persona.tipo === "CLIENTE" ? "default" : "secondary"}>
                  {persona.tipo === "CLIENTE" ? "Cliente" : "Proveedor"}
                </Badge>
              </div>
              <div className="flex gap-2" data-no-print>
                <button
                  onClick={() => window.print()}
                  className="text-xs border rounded px-2.5 py-1 hover:bg-muted/40 transition-colors"
                >
                  Imprimir
                </button>
                <button
                  onClick={handlePDF}
                  disabled={isGenerating}
                  className="text-xs border rounded px-2.5 py-1 hover:bg-muted/40 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Generando…" : "PDF"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y text-sm">
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">CUIT</p>
              <p className="font-mono font-medium">{persona.cuit}</p>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="font-medium">{persona.codigo ?? "—"}</p>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Localidad</p>
              <p className="font-medium">{persona.localidad ?? "—"}</p>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Provincia</p>
              <p className="font-medium">{persona.provincia ?? "—"}</p>
            </div>
            {persona.tipo === "CLIENTE" && (
              <div className="px-4 py-2.5">
                <p className="text-xs text-muted-foreground">Máx. crédito</p>
                <p className="font-medium">
                  {persona.maxCredito != null ? formatearPesos(persona.maxCredito) : "—"}
                </p>
              </div>
            )}
            <div className="px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <p className="font-medium">{formatearPesos(persona.saldoInicial)}</p>
            </div>
            <div className={cn("px-4 py-2.5", persona.tipo === "CLIENTE" ? "" : "col-span-2")}>
              <p className="text-xs text-muted-foreground">Saldo actual</p>
              <p className={cn(
                "font-bold",
                persona.saldo > 0 ? "text-destructive" : "text-green-600",
              )}>
                {formatearPesos(persona.saldo)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Opciones de filtro ────────────────────────────────────────── */}
      {persona && (
        <div className="border rounded-lg p-4 space-y-2" data-no-print>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Opciones de Selección
          </p>
          <div className="space-y-1.5">
            {FILTROS.map((f) => (
              <label key={f.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="filtroCC"
                  value={f.value}
                  checked={filtro === f.value}
                  onChange={() => cambiarFiltro(f.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Tabla de resultados ───────────────────────────────────────── */}
      {persona && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between">
            <p className="text-sm font-semibold">
              {FILTROS.find((f) => f.value === filtro)?.label}
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                ({movimientos.length} movimiento{movimientos.length !== 1 ? "s" : ""})
              </span>
            </p>
          </div>

          {cargando ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {persona.cuentaId
                ? "Sin movimientos para el filtro seleccionado."
                : "Esta persona no tiene cuenta corriente."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Fecha</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Número</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Concepto</th>
                    <th className="text-right px-3 py-2 font-semibold text-destructive whitespace-nowrap">Debe</th>
                    <th className="text-right px-3 py-2 font-semibold text-green-700 whitespace-nowrap">Haber</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movimientos.map((m, i) => (
                    <tr key={m.id} className={cn("hover:bg-muted/10", i % 2 !== 0 && "bg-muted/5")}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {fmtFecha(m.fecha)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs font-normal">
                          {m.tipoComprobante}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                        {m.numero ?? "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[260px] truncate">{m.descripcion}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-destructive font-medium">
                        {m.debe > 0 ? formatearPesos(m.debe) : ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-700 font-medium">
                        {m.haber > 0 ? formatearPesos(m.haber) : ""}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        m.saldoAcumulado > 0 ? "text-destructive" : "text-green-700",
                      )}>
                        {formatearPesos(m.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-muted/20 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-xs text-muted-foreground">
                      Totales
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-destructive">
                      {formatearPesos(totalDebe)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">
                      {formatearPesos(totalHaber)}
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right tabular-nums font-bold",
                      saldoFinal > 0 ? "text-destructive" : "text-green-700",
                    )}>
                      {formatearPesos(saldoFinal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
