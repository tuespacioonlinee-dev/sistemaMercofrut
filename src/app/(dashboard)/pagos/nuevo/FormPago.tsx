"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { registrarPago } from "@/server/actions/cuentas"
import { formatearPesos } from "@/lib/utils"
import { generarClientRequestId, submitSeguro } from "@/lib/submit-helpers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Cuenta {
  id: string
  nombre: string
  saldo: number
  proveedor: { id: string; nombreRazonSocial: string } | null
}

interface Props {
  cuentas: Cuenta[]
  preseleccionId?: string
}

export function FormPago({ cuentas, preseleccionId }: Props) {
  const router = useRouter()
  const [cuentaId, setCuentaId] = useState(preseleccionId ?? "")
  const [busqueda, setBusqueda] = useState("")
  const [monto, setMonto] = useState("")
  const [concepto, setConcepto] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idempotencyRef = useRef<string>(generarClientRequestId())

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((c) => c.id === cuentaId) ?? null,
    [cuentas, cuentaId]
  )

  const cuentasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return cuentas
    const q = busqueda.toLowerCase()
    return cuentas.filter(
      (c) =>
        c.proveedor?.nombreRazonSocial.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q)
    )
  }, [cuentas, busqueda])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = parseFloat(monto.replace(",", "."))
    if (!cuentaId) return setError("Seleccioná una cuenta")
    if (isNaN(montoNum) || montoNum <= 0) return setError("Ingresá un monto válido")
    if (!concepto.trim()) return setError("Ingresá un concepto")

    setLoading(true)
    try {
      const res = await submitSeguro(() =>
        registrarPago(cuentaId, montoNum, concepto.trim(), idempotencyRef.current)
      )
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/cuentas/${cuentaId}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label>Proveedor / Cuenta</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar proveedor..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setCuentaId("") }}
            className="pl-9"
          />
        </div>

        {(busqueda || !cuentaId) && (
          <div className="border rounded-md divide-y max-h-52 overflow-y-auto bg-background shadow-sm">
            {cuentasFiltradas.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              cuentasFiltradas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCuentaId(c.id); setBusqueda("") }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center justify-between gap-4",
                    c.id === cuentaId && "bg-primary/5"
                  )}
                >
                  <span className="font-medium">{c.proveedor?.nombreRazonSocial ?? c.nombre}</span>
                  <span className={cn(
                    "tabular-nums font-semibold shrink-0",
                    c.saldo > 0 ? "text-destructive" : "text-green-600"
                  )}>
                    {formatearPesos(c.saldo)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {cuentaSeleccionada && !busqueda && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{cuentaSeleccionada.proveedor?.nombreRazonSocial ?? cuentaSeleccionada.nombre}</p>
                  <p className="text-xs text-muted-foreground">{cuentaSeleccionada.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Deuda actual</p>
                  <p className={cn(
                    "text-xl font-bold tabular-nums",
                    cuentaSeleccionada.saldo > 0 ? "text-destructive" : "text-green-600"
                  )}>
                    {formatearPesos(cuentaSeleccionada.saldo)}
                  </p>
                  {cuentaSeleccionada.saldo > 0 && (
                    <Badge variant="destructive" className="text-xs mt-1">Le debemos</Badge>
                  )}
                  {cuentaSeleccionada.saldo <= 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">Sin deuda</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="monto">Monto pagado ($)</Label>
        <Input
          id="monto"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0,00"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="text-lg font-semibold"
        />
        {cuentaSeleccionada && monto && !isNaN(parseFloat(monto)) && (
          <p className="text-xs text-muted-foreground">
            Deuda después del pago:{" "}
            <span className={cn(
              "font-semibold",
              cuentaSeleccionada.saldo - parseFloat(monto) > 0 ? "text-destructive" : "text-green-600"
            )}>
              {formatearPesos(cuentaSeleccionada.saldo - parseFloat(monto))}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="concepto">Concepto</Label>
        <Input
          id="concepto"
          placeholder="Ej: Pago factura N°123, Anticipo..."
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          maxLength={200}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !cuentaId} className="min-w-32">
          {loading ? "Registrando..." : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Registrar pago
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
