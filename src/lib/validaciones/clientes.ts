import { z } from "zod"

/**
 * Valida un CUIT/CUIL argentino con el algoritmo módulo 11.
 *
 * Acepta el documento con o sin guiones (XX-XXXXXXXX-X o XXXXXXXXXXX).
 * Devuelve true si los 11 dígitos cumplen el dígito verificador.
 *
 * Algoritmo:
 *   DV = 11 - ((Σ dᵢ · pᵢ) mod 11), con pesos [5,4,3,2,7,6,5,4,3,2] sobre los primeros 10 dígitos.
 *   Si DV = 11 → 0. Si DV = 10 → CUIT inválido.
 */
export function validarCUIT(input: string): boolean {
  const digitos = input.replace(/[\s\-_.]/g, "")
  if (!/^\d{11}$/.test(digitos)) return false

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(digitos[i]), 0)
  const resto = suma % 11
  let dv = 11 - resto
  if (dv === 11) dv = 0
  if (dv === 10) return false // CUIT con DV=10 es inválido por convención AFIP

  return dv === Number(digitos[10])
}

export const esquemaCliente = z
  .object({
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
    // (de la rama de Carlos) — referencia opcional a ListaPrecio para precios
    // diferenciados por cliente. Si es null/undefined cae a la lista default.
    listaPrecioId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // El DV solo se valida para CUIT y CUIL — los demás tipos pasan tal cual.
    if (data.tipoDocumento === "CUIT" || data.tipoDocumento === "CUIL") {
      if (!validarCUIT(data.documento)) {
        ctx.addIssue({
          code: "custom",
          path: ["documento"],
          message: `${data.tipoDocumento} inválido — verificá el dígito verificador`,
        })
      }
    }
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
