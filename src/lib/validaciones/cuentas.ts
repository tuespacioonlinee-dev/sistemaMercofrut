import { z } from "zod"

export const esquemaCuenta = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  tipo: z.enum(["CONTADO", "CORRIENTE"]),
  clienteId: z.string().min(1, "Seleccioná un cliente"),
})

export type DatosCuenta = z.infer<typeof esquemaCuenta>

export const etiquetasTipoCuenta: Record<string, string> = {
  CONTADO: "Contado",
  CORRIENTE: "Cuenta Corriente",
}
