import { z } from "zod"

export const esquemaParametros = z.object({
  nombreFantasia: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  razonSocial: z.string().min(2, "La razón social debe tener al menos 2 caracteres"),
  cuit: z.string().min(11, "El CUIT debe tener al menos 11 caracteres"),
  condicionIva: z.enum([
    "RESPONSABLE_INSCRIPTO",
    "MONOTRIBUTO",
    "EXENTO",
    "CONSUMIDOR_FINAL",
    "NO_RESPONSABLE",
  ]),
  direccion: z.string().min(2, "La dirección es obligatoria"),
  localidad: z.string().min(2, "La localidad es obligatoria"),
  telefono: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: "Email inválido" }
    ),
  ingresosBrutos: z.string().optional(),
  inicioActividades: z.string().optional(),
})

export type DatosParametros = z.infer<typeof esquemaParametros>

export const etiquetasCondicionIva: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTO: "Monotributo",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
  NO_RESPONSABLE: "No Responsable",
}
