/**
 * Parseo de flags del CLI del seed de demo.
 *
 * Flags soportados:
 *  --confirm           Ejecuta el seed contra la DB. Sin este flag, es dry-run.
 *  --admin-email <e>   Opcional: email del admin a preservar. Si no se pasa,
 *                      preserva TODOS los usuarios con rol=ADMIN activos.
 *  --dias <n>          Cantidad de días de operación a generar (default: 5).
 */

export interface DemoSeedArgs {
  /** True si pasó --confirm (modo ejecución real). False = dry-run. */
  confirm: boolean
  /** Email específico del admin a preservar. Null = preservar todos los admins. */
  adminEmail: string | null
  /** Cantidad de días de operación a sembrar (default 5). */
  dias: number
}

export function parseArgs(argv: string[]): DemoSeedArgs {
  const args: DemoSeedArgs = { confirm: false, adminEmail: null, dias: 5 }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--confirm") {
      args.confirm = true
    } else if (a === "--admin-email") {
      const v = argv[++i]
      if (!v || v.startsWith("--")) {
        throw new Error("--admin-email requiere un valor")
      }
      args.adminEmail = v
    } else if (a === "--dias") {
      const v = argv[++i]
      const n = Number(v)
      if (!Number.isInteger(n) || n < 1 || n > 30) {
        throw new Error("--dias requiere un entero entre 1 y 30")
      }
      args.dias = n
    } else if (a === "--help" || a === "-h") {
      console.log(`
Uso:
  npx dotenv -e .env.local -- npx tsx scripts/demo-reset-and-seed.ts [opciones]

Opciones:
  --confirm              Ejecutá la limpieza + seed. Sin este flag corre dry-run.
  --admin-email <email>  Preservar solo el admin con este email (default: todos los admins).
  --dias <n>             Cantidad de días de operación (default: 5).
  --help, -h             Mostrar esta ayuda.

Sin --confirm: imprime el plan completo (qué borraría, qué crearía, counts), no toca la DB.
`)
      process.exit(0)
    } else {
      throw new Error(`Argumento desconocido: ${a}. Usá --help para ver opciones.`)
    }
  }

  return args
}
