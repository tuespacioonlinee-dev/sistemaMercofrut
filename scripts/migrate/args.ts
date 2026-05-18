// scripts/migrate/args.ts
import { existsSync } from "fs";

export interface MigrateArgs {
  target: string;
  productos?: string;
  clientes?: string;
  proveedores?: string;
}

export interface MigrateEnv {
  anthropicApiKey: string;
}

const VALID_EXTENSIONS = [".xlsx", ".csv"];

export function parseArgs(argv: string[]): MigrateArgs {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }

  if (!args.target) {
    throw new Error(
      `Falta --target (connection string de la DB destino)\n\n` +
        `Uso: npx tsx scripts/migrate-legacy.ts \\\n` +
        `  --target="postgresql://user:pass@host/db" \\\n` +
        `  --productos="datos/productos.xlsx" \\\n` +
        `  --clientes="datos/clientes.csv" \\\n` +
        `  --proveedores="datos/proveedores.xlsx"`
    );
  }

  if (!args.productos && !args.clientes && !args.proveedores) {
    throw new Error(
      "Debe especificar al menos uno: --productos, --clientes, o --proveedores"
    );
  }

  for (const [key, path] of Object.entries(args)) {
    if (key === "target") continue;
    if (!["productos", "clientes", "proveedores"].includes(key)) continue;

    if (!existsSync(path)) {
      throw new Error(`Archivo no encontrado: ${path}`);
    }

    const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Formato no soportado: "${ext}" en ${path}. Usar .xlsx o .csv`
      );
    }
  }

  return {
    target: args.target,
    productos: args.productos,
    clientes: args.clientes,
    proveedores: args.proveedores,
  };
}

export function loadEnv(): MigrateEnv {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error("Falta env var ANTHROPIC_API_KEY");
  }
  return { anthropicApiKey };
}
