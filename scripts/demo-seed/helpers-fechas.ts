/**
 * Helpers de fechas para el seed de demo.
 *
 * - `diaHabilHaceNDias`: devuelve una Date N días atrás "saltando" sábados y domingos.
 * - `aHoraHabil`: setea la hora dentro de la jornada laboral (8-18hs).
 */

/** Restar N días hábiles (lun-vie) desde hoy. */
export function diaHabilHaceNDias(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  let dias = 0
  while (dias < n) {
    d.setDate(d.getDate() - 1)
    const dow = d.getDay() // 0=domingo, 6=sábado
    if (dow !== 0 && dow !== 6) dias++
  }
  return d
}

/**
 * Setea la fecha a una hora hábil determinística según un seed.
 * Rango: 8:00 a 17:59hs. Minutos seudoaleatorios.
 */
export function aHoraHabil(base: Date, seed: number): Date {
  const d = new Date(base)
  const hora = 8 + (seed % 10)         // 8..17
  const minuto = (seed * 37) % 60       // 0..59
  const segundo = (seed * 13) % 60
  d.setHours(hora, minuto, segundo, 0)
  return d
}

/** Apertura de caja típica: 8:00 del día. */
export function aHoraApertura(base: Date): Date {
  const d = new Date(base)
  d.setHours(8, 0, 0, 0)
  return d
}

/** Cierre de caja típico: 18:30 del día. */
export function aHoraCierre(base: Date): Date {
  const d = new Date(base)
  d.setHours(18, 30, 0, 0)
  return d
}
