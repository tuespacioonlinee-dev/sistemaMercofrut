/**
 * Guard anti-disparo en pie para tests E2E.
 *
 * Verifica que TEST_DATABASE_URL NO apunte a un host de producción.
 *
 * Estrategia:
 * 1. Extrae el host (sin puerto) de TEST_DATABASE_URL.
 * 2. Lo compara contra `PROD_DB_HOSTS_BLOCKLIST` (lista en .env.test).
 * 3. Si coincide con cualquiera, aborta con error claro.
 *
 * El usuario es responsable de mantener la blocklist actualizada con todos
 * los hosts de prod conocidos (pooler y direct). Si agrega una nueva DB
 * productiva sin actualizar la blocklist, esa es una decisión consciente.
 */

export function assertNotProductionDb(url: string): void {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    throw new Error(`TEST_DATABASE_URL inválida: no se pudo parsear como URL.`)
  }

  if (!host) {
    throw new Error(`TEST_DATABASE_URL no tiene host.`)
  }

  const blocklistRaw = process.env.PROD_DB_HOSTS_BLOCKLIST ?? ""
  const blocklist = blocklistRaw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0)

  if (blocklist.length === 0) {
    throw new Error(
      "PROD_DB_HOSTS_BLOCKLIST está vacía en .env.test.\n" +
      "Configurala con los hosts de prod (separados por coma) para que el guard pueda funcionar.",
    )
  }

  if (blocklist.includes(host)) {
    throw new Error(
      `❌ ABORTADO: TEST_DATABASE_URL apunta a un host de PRODUCCIÓN.\n` +
      `   Host detectado: ${host}\n` +
      `   Blocklist:      ${blocklist.join(", ")}\n` +
      `   Cambiá TEST_DATABASE_URL para que apunte a una branch de testing.`,
    )
  }

  // Verificación extra: comparar también contra el host sin "-pooler".
  // Neon expone el mismo branch en dos endpoints (pooler y direct).
  const sinPooler = host.replace("-pooler", "")
  if (sinPooler !== host && blocklist.includes(sinPooler)) {
    throw new Error(
      `❌ ABORTADO: TEST_DATABASE_URL (pooler) apunta al mismo branch que un host de PRODUCCIÓN.\n` +
      `   Host (pooler):  ${host}\n` +
      `   Host (direct):  ${sinPooler} ← está en la blocklist\n` +
      `   Cambiá TEST_DATABASE_URL.`,
    )
  }
}
