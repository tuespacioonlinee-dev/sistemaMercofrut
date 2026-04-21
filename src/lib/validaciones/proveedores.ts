import { z } from "zod"
import { CondicionIva, TipoDocumento } from "@prisma/client"

export const proveedorSchema = z.object({
  nombreRazonSocial: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  tipoDocumento: z.nativeEnum(TipoDocumento),
  documento: z.string().min(7, "Documento inválido").max(20).trim(),
  condicionIva: z.nativeEnum(CondicionIva),
  direccion: z.string().max(200).trim().optional(),
  localidad: z.string().max(100).trim().optional(),
  telefono: z.string().max(30).trim().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  observaciones: z.string().max(500).trim().optional(),
})

export type ProveedorInput = z.infer<typeof proveedorSchema>
