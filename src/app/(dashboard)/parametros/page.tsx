import { obtenerParametros, guardarParametros } from "@/server/actions/parametros"
import { obtenerComprobantes, actualizarNumeracion } from "@/server/actions/parametros"
import { FormularioParametros } from "./FormularioParametros"
import { FormNumeracion } from "./FormNumeracion"
import { DatosParametros } from "@/lib/validaciones/parametros"
import type { DatosNumeracion } from "@/server/actions/parametros"
import { Separator } from "@/components/ui/separator"

export const dynamic = "force-dynamic"

export default async function ParametrosPage() {
  const [parametros, comprobantes] = await Promise.all([
    obtenerParametros(),
    obtenerComprobantes(),
  ])

  async function accionGuardar(data: DatosParametros) {
    "use server"
    return guardarParametros(data)
  }

  async function accionNumeracion(data: DatosNumeracion) {
    "use server"
    return actualizarNumeracion(data)
  }

  return (
    <div className="p-6 max-w-2xl space-y-10">
      {/* ── Datos del negocio ──────────────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Parámetros del negocio</h1>
          <p className="text-sm text-muted-foreground">
            Datos fiscales y de contacto que se usan en remitos y facturas.
          </p>
        </div>

        <FormularioParametros
          onSubmit={accionGuardar}
          valoresIniciales={
            parametros
              ? {
                  nombreFantasia:    parametros.nombreFantasia,
                  razonSocial:       parametros.razonSocial,
                  cuit:              parametros.cuit,
                  condicionIva:      parametros.condicionIva,
                  direccion:         parametros.direccion,
                  localidad:         parametros.localidad,
                  telefono:          parametros.telefono ?? undefined,
                  email:             parametros.email ?? undefined,
                  ingresosBrutos:    parametros.ingresosBrutos ?? undefined,
                  inicioActividades: parametros.inicioActividades
                    ? parametros.inicioActividades.toISOString().split("T")[0]
                    : undefined,
                }
              : undefined
          }
        />
      </div>

      <Separator />

      {/* ── Numeración de comprobantes ─────────────────────────────────── */}
      <div id="numeracion" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Numeración de comprobantes</h2>
          <p className="text-sm text-muted-foreground">
            Ajustá el próximo número de remito y facturas, y el punto de venta.
            Usá esto si te equivocaste con la numeración o necesitás reiniciarla.
          </p>
        </div>

        <div className="border rounded-lg p-5 bg-muted/20">
          <FormNumeracion
            valoresIniciales={comprobantes}
            onSubmit={accionNumeracion}
          />
        </div>
      </div>
    </div>
  )
}
