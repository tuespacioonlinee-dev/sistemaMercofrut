/**
 * Helpers para generar CUITs y DNIs válidos para el seed de demo.
 *
 * El cálculo del dígito verificador (DV) de CUIT/CUIL usa el mismo algoritmo
 * módulo-11 que `validarCUIT` en src/lib/validaciones/clientes.ts.
 */

const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const

/** Calcula el DV (mod 11) para los 10 primeros dígitos. Null si DV=10 (CUIT inválido por AFIP). */
function calcularDV(diezDigitos: string): number | null {
  const suma = PESOS_CUIT.reduce((acc, p, i) => acc + p * Number(diezDigitos[i]), 0)
  const resto = suma % 11
  let dv = 11 - resto
  if (dv === 11) dv = 0
  if (dv === 10) return null
  return dv
}

/**
 * Genera un CUIT válido a partir de un prefijo y una base de 8 dígitos.
 * Si la base genera DV=10, prueba con base+1, base+2... hasta encontrar uno válido.
 * Devuelve el CUIT formateado con guiones: "XX-XXXXXXXX-X".
 *
 * Prefijos comunes:
 *  - 30, 33, 34 → personas jurídicas (SA, SRL, Cooperativas)
 *  - 20         → varones (persona física, productores directos)
 *  - 27         → mujeres (persona física)
 *  - 23, 24     → casos mixtos
 */
export function generarCUIT(prefijo: "20" | "23" | "24" | "27" | "30" | "33" | "34", baseSeed: number): string {
  for (let i = 0; i < 100; i++) {
    const baseStr = (baseSeed + i).toString().padStart(8, "0")
    const diez = prefijo + baseStr
    const dv = calcularDV(diez)
    if (dv !== null) {
      return `${prefijo}-${baseStr}-${dv}`
    }
  }
  throw new Error(`No se pudo generar CUIT válido con prefijo ${prefijo} y base ${baseSeed}`)
}

/**
 * Genera un DNI argentino de 8 dígitos a partir de un seed determinístico.
 * Rango: 20.000.000 a 49.999.999 (común para adultos).
 */
export function generarDNI(seed: number): string {
  const num = 20_000_000 + (Math.abs(seed) % 30_000_000)
  return String(num)
}

/** Sanity check: valida un CUIT (acepta con o sin guiones). */
export function esCUITValido(input: string): boolean {
  const digitos = input.replace(/[\s\-_.]/g, "")
  if (!/^\d{11}$/.test(digitos)) return false
  const dv = calcularDV(digitos.slice(0, 10))
  if (dv === null) return false
  return dv === Number(digitos[10])
}
