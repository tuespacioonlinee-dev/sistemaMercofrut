/**
 * Genera un fingerprint estable del navegador/dispositivo.
 *
 * Lo guardamos en localStorage para que sobreviva refreshes y sesiones.
 * NO es seguridad — es solo identificación. El server además valida que
 * el fingerprint corresponda al usuario logueado.
 *
 * El hash es de userAgent + screen + timezone + un randomId persistido,
 * suficiente para distinguir devices distintos del mismo usuario.
 */

const STORAGE_KEY = "mercofrut.offline.fingerprint"

export function getFingerprint(): string {
  if (typeof window === "undefined") return ""

  let fp = window.localStorage.getItem(STORAGE_KEY)
  if (fp) return fp

  const seed = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    Math.random().toString(36).slice(2),
    Date.now().toString(36),
  ].join("|")

  // Hash sencillo (sjcl/crypto-subtle es overkill — esto solo necesita ser
  // estable y razonablemente único, no criptográfico).
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }

  fp = `fp-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`
  window.localStorage.setItem(STORAGE_KEY, fp)
  return fp
}
