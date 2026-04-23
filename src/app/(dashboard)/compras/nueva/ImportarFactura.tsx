"use client"

import { useState, useRef } from "react"
import { Sparkles, Upload, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ALICUOTAS_IVA, detectarAlicuota, type AlicuotaIVA } from "@/lib/validaciones/compras"

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Proveedor = { id: string; nombreRazonSocial: string; cuit?: string | null }
type Producto  = { id: string; nombre: string; unidadBase: { id: string; abreviatura: string } }

interface ExtractedItem {
  descripcion:         string
  productoIdSugerido:  string | null
  cantidad:            number
  unidad:              string
  precioUnitario:      number
  subtotal:            number
}

interface ExtractedData {
  proveedor:       { nombre: string; cuit: string | null }
  tipoComprobante: string | null   // "FACTURA_A" | "FACTURA_B" | "FACTURA_C" | "REMITO" | etc.
  comprobante:     string | null
  fecha:           string | null
  condicion:       "CONTADO" | "CUENTA_CORRIENTE" | null
  iva:             number
  items:           ExtractedItem[]
  descuento:       number
  total:           number
}

interface ReviewItem {
  descripcion:          string
  productoIdSeleccionado: string
  cantidad:             number
  precioUnitario:       number
}

export interface DatosImportados {
  proveedorId:       string
  condicion:         "CONTADO" | "CUENTA_CORRIENTE"
  tipoComprobante:   string | null
  numeroComprobante: string
  ivaAlicuota:       AlicuotaIVA  // porcentaje (0, 10.5, 21, 27…)
  descuento:         number
  detalles: Array<{
    productoId:     string
    unidadId:       string
    cantidad:       number
    precioUnitario: number
  }>
}

interface Props {
  proveedores: Proveedor[]
  productos:   Producto[]
  onAplicar:   (data: DatosImportados) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const selectCls = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
)

function matchProveedor(extraido: ExtractedData["proveedor"], lista: Proveedor[]): string {
  // 1. Por CUIT exacto
  if (extraido.cuit) {
    const soloDigitos = extraido.cuit.replace(/\D/g, "")
    const porCuit = lista.find((p) => p.cuit?.replace(/\D/g, "") === soloDigitos)
    if (porCuit) return porCuit.id
  }
  // 2. Por nombre (contains, case-insensitive)
  if (extraido.nombre) {
    const lower = extraido.nombre.toLowerCase()
    const porNombre = lista.find((p) =>
      p.nombreRazonSocial.toLowerCase().includes(lower) ||
      lower.includes(p.nombreRazonSocial.toLowerCase())
    )
    if (porNombre) return porNombre.id
  }
  return ""
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ImportarFactura({ proveedores, productos, onAplicar }: Props) {
  const inputRef                      = useRef<HTMLInputElement>(null)
  const [estado, setEstado]           = useState<"idle" | "cargando" | "revision">("idle")
  const [extraido, setExtraido]       = useState<ExtractedData | null>(null)
  const [proveedorId, setProveedorId]     = useState("")
  const [condicion, setCondicion]         = useState<"CONTADO" | "CUENTA_CORRIENTE">("CONTADO")
  const [comprobante, setComprobante]     = useState("")
  const [ivaAlicuota, setIvaAlicuota]    = useState<AlicuotaIVA>(0)
  const [descuento, setDescuento]         = useState(0)
  const [items, setItems]                 = useState<ReviewItem[]>([])

  // ── Procesar imagen ──────────────────────────────────────────────────────

  async function handleArchivo(file: File) {
    setEstado("cargando")

    const fd = new FormData()
    fd.append("imagen", file)
    fd.append("productos", JSON.stringify(productos.map((p) => ({ id: p.id, nombre: p.nombre }))))

    try {
      const res  = await fetch("/api/ia/factura", { method: "POST", body: fd })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? "No se pudo procesar la factura.")
        setEstado("idle")
        return
      }

      const datos: ExtractedData = json.datos

      // Pre-calcular estado de revisión
      setExtraido(datos)
      setProveedorId(matchProveedor(datos.proveedor, proveedores))
      setCondicion(datos.condicion ?? "CONTADO")
      setComprobante(datos.comprobante ?? "")
      setDescuento(datos.descuento ?? 0)

      // Detectar alícuota ARCA más cercana al monto de IVA extraído
      const subtotalExtraido = datos.items.reduce(
        (acc, it) => acc + it.cantidad * it.precioUnitario, 0
      )
      setIvaAlicuota(detectarAlicuota(datos.iva ?? 0, subtotalExtraido))
      setItems(
        datos.items.map((it) => ({
          descripcion:            it.descripcion,
          productoIdSeleccionado: it.productoIdSugerido ?? "",
          cantidad:               it.cantidad,
          precioUnitario:         it.precioUnitario,
        }))
      )
      setEstado("revision")
    } catch {
      toast.error("Error de conexión al procesar la factura.")
      setEstado("idle")
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleArchivo(file)
    e.target.value = "" // reset para poder subir la misma imagen de nuevo
  }

  // ── Aplicar ──────────────────────────────────────────────────────────────

  function aplicar() {
    const detallesValidos = items.filter((it) => it.productoIdSeleccionado && it.cantidad > 0)

    if (!proveedorId) {
      toast.warning("Seleccioná un proveedor antes de aplicar.")
      return
    }
    if (detallesValidos.length === 0) {
      toast.warning("Asigná al menos un producto del sistema.")
      return
    }

    onAplicar({
      proveedorId,
      condicion,
      tipoComprobante: extraido?.tipoComprobante ?? null,
      numeroComprobante: comprobante,
      ivaAlicuota,
      descuento,
      detalles: detallesValidos.map((it) => {
        const prod = productos.find((p) => p.id === it.productoIdSeleccionado)!
        return {
          productoId:     it.productoIdSeleccionado,
          unidadId:       prod.unidadBase.id,
          cantidad:       it.cantidad,
          precioUnitario: it.precioUnitario,
        }
      }),
    })

    setEstado("idle")
    setExtraido(null)
    toast.success("Formulario pre-llenado. Revisá los datos antes de confirmar.")
  }

  function cancelar() {
    setEstado("idle")
    setExtraido(null)
  }

  function updateItem<K extends keyof ReviewItem>(index: number, campo: K, valor: ReviewItem[K]) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it)))
  }

  // ── Render: idle ─────────────────────────────────────────────────────────

  if (estado === "idle") {
    return (
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInput} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400"
          onClick={() => inputRef.current?.click()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Importar desde foto de factura
        </Button>
        <span className="text-xs text-muted-foreground">JPG, PNG o WEBP</span>
      </div>
    )
  }

  // ── Render: cargando ─────────────────────────────────────────────────────

  if (estado === "cargando") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        <div>
          <p className="text-sm font-medium text-violet-700">Analizando la factura…</p>
          <p className="text-xs text-violet-500">Claude está leyendo los datos, tardará unos segundos.</p>
        </div>
      </div>
    )
  }

  // ── Render: revisión ─────────────────────────────────────────────────────

  const itemsSinAsignar = items.filter((it) => !it.productoIdSeleccionado).length

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-4">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-violet-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-800">Datos extraídos — revisá antes de aplicar</p>
            {extraido?.proveedor.nombre && (
              <p className="text-xs text-violet-600">Factura de: {extraido.proveedor.nombre}</p>
            )}
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelar}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Datos generales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Proveedor</Label>
          <select
            className={selectCls}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
          >
            <option value="">— seleccioná —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombreRazonSocial}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Condición</Label>
          <select
            className={selectCls}
            value={condicion}
            onChange={(e) => setCondicion(e.target.value as "CONTADO" | "CUENTA_CORRIENTE")}
          >
            <option value="CONTADO">Contado</option>
            <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">N° Comprobante</Label>
          <Input
            className="h-8 text-sm"
            value={comprobante}
            onChange={(e) => setComprobante(e.target.value)}
            placeholder="0001-00000000"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Alícuota IVA</Label>
          <select
            className={selectCls}
            value={ivaAlicuota}
            onChange={(e) => setIvaAlicuota(Number(e.target.value) as AlicuotaIVA)}
          >
            {ALICUOTAS_IVA.map((a) => (
              <option key={a.valor} value={a.valor}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Descuento ($)</Label>
          <Input
            className="h-8 text-sm"
            type="number"
            min="0"
            step="0.01"
            value={descuento}
            onChange={(e) => setDescuento(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Tabla de ítems */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_80px_100px] gap-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground">En la factura</span>
          <span className="text-xs font-semibold text-muted-foreground">Producto del sistema</span>
          <span className="text-xs font-semibold text-muted-foreground">Cant.</span>
          <span className="text-xs font-semibold text-muted-foreground">Precio unit.</span>
        </div>

        {items.map((item, i) => {
          const asignado = !!item.productoIdSeleccionado
          return (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[1fr_1fr_80px_100px] gap-2 items-center rounded-lg px-2 py-1.5",
                asignado ? "bg-white/70" : "bg-amber-50 border border-amber-200"
              )}
            >
              {/* Descripción extraída */}
              <span className="text-xs text-slate-600 truncate" title={item.descripcion}>
                {item.descripcion}
              </span>

              {/* Selector de producto */}
              <select
                className={cn(selectCls, !asignado && "border-amber-400")}
                value={item.productoIdSeleccionado}
                onChange={(e) => updateItem(i, "productoIdSeleccionado", e.target.value)}
              >
                <option value="">— asignar —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              {/* Cantidad */}
              <Input
                type="number"
                step="0.001"
                min="0"
                className="h-8 text-xs"
                value={item.cantidad}
                onChange={(e) => updateItem(i, "cantidad", Number(e.target.value))}
              />

              {/* Precio */}
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-xs"
                value={item.precioUnitario}
                onChange={(e) => updateItem(i, "precioUnitario", Number(e.target.value))}
              />
            </div>
          )
        })}
      </div>

      {/* Advertencia si hay ítems sin asignar */}
      {itemsSinAsignar > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {itemsSinAsignar} ítem{itemsSinAsignar > 1 ? "s" : ""} sin asignar — se omitirán al aplicar.
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          onClick={aplicar}
        >
          <Upload className="h-3.5 w-3.5" />
          Aplicar al formulario
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={cancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
