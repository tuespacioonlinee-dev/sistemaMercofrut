"use client"

import { FormVenta } from "./FormVenta"
import { FormVentaOffline } from "./FormVentaOffline"
import { OFFLINE_MODE_ENABLED } from "@/lib/feature-flags"
import { useConnectivity } from "@/hooks/useConnectivity"
import type { VentaInput } from "@/lib/validaciones/ventas"

interface Cliente { id: string; nombreRazonSocial: string; documento: string }
interface Unidad  { id: string; nombre: string; abreviatura: string }
interface ProductoUnidadAlternativa { unidadId: string; factor: unknown; unidad: Unidad }
interface Producto {
  id: string
  nombre: string
  codigo: string
  precioVenta: number
  stockTotal:  number
  unidadBase: Unidad
  unidadesAlternativas: ProductoUnidadAlternativa[]
}

interface Props {
  clientes:  Cliente[]
  productos: Producto[]
  unidades:  Unidad[]
  onSubmit:  (data: VentaInput) => Promise<{
    ok?:           boolean
    error?:        string
    ventaId?:      string
    remitoId?:     string
    remitoNumero?: string
    duplicada?:    boolean
  }>
}

/**
 * Decide entre FormVenta (online, comportamiento actual) y FormVentaOffline
 * (Dexie + reservas) según conectividad y feature flag.
 *
 * Si OFFLINE_MODE_ENABLED=false → siempre FormVenta. Cero diff con
 * el sistema actual.
 */
export function FormVentaSwitch(props: Props) {
  // Early return total con flag off — ni siquiera importamos useConnectivity
  // (igual está importado top-level, pero el hook no se ejecuta acá).
  if (!OFFLINE_MODE_ENABLED) {
    return <FormVenta {...props} />
  }
  return <FormVentaSwitchInner {...props} />
}

function FormVentaSwitchInner(props: Props) {
  const { online } = useConnectivity()
  if (online) return <FormVenta {...props} />
  return <FormVentaOffline />
}
