import { z } from "zod"

export const esquemaCliente = z.object({
  nombreRazonSocial: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  tipoDocumento: z.enum(["CUIT", "CUIL", "DNI", "PASAPORTE", "OTRO"]),
  documento: z
    .string()
    .min(7, "El documento debe tener al menos 7 caracteres"),
  condicionIva: z.enum([
    "RESPONSABLE_INSCRIPTO",
    "MONOTRIBUTO",
    "EXENTO",
    "CONSUMIDOR_FINAL",
    "NO_RESPONSABLE",
  ]),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  telefono: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: "Email inválido" }
    ),
  observaciones: z.string().optional(),
})

export type DatosCliente = z.infer<typeof esquemaCliente>

// Etiquetas para mostrar en la UI
export const etiquetasTipoDocumento: Record<string, string> = {
  CUIT: "CUIT",
  CUIL: "CUIL",
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
}

export const etiquetasCondicionIva: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
  NO_RESPONSABLE: "No Responsable",
}
