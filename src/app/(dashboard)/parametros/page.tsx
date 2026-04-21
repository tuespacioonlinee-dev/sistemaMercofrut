import { obtenerParametros, guardarParametros } from "@/server/actions/parametros"
import { FormularioParametros } from "./FormularioParametros"
import { DatosParametros } from "@/lib/validaciones/parametros"

export default async function ParametrosPage() {
  const parametros = await obtenerParametros()

  async function accionGuardar(data: DatosParametros) {
    "use server"
    return guardarParametros(data)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
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
                nombreFantasia: parametros.nombreFantasia,
                razonSocial: parametros.razonSocial,
                cuit: parametros.cuit,
                condicionIva: parametros.condicionIva,
                direccion: parametros.direccion,
                localidad: parametros.localidad,
                telefono: parametros.telefono ?? undefined,
                email: parametros.email ?? undefined,
                ingresosBrutos: parametros.ingresosBrutos ?? undefined,
                inicioActividades: parametros.inicioActividades
                  ? parametros.inicioActividades.toISOString().split("T")[0]
                  : undefined,
              }
            : undefined
        }
      />
    </div>
  )
}
