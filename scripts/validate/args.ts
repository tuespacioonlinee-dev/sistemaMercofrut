// scripts/validate/args.ts

export interface ValidateArgs {
  target: string;
  fecha: Date;
}

export function parseArgs(argv: string[]): ValidateArgs {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }

  if (!args.target) {
    throw new Error(
      `Falta --target (connection string de la DB del cliente)\n\n` +
        `Uso: npx tsx scripts/validate-daily.ts \\\n` +
        `  --target="postgresql://user:pass@host/db" \\\n` +
        `  --fecha="2026-05-18"`
    );
  }

  let fecha = new Date();
  if (args.fecha) {
    const parsed = new Date(args.fecha + "T00:00:00");
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Fecha inválida: "${args.fecha}". Usar formato YYYY-MM-DD`
      );
    }
    fecha = parsed;
  }

  return { target: args.target, fecha };
}
