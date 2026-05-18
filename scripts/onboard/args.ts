// scripts/onboard/args.ts

const CONDICION_IVA_VALUES = [
  "RESPONSABLE_INSCRIPTO",
  "MONOTRIBUTO",
  "EXENTO",
  "CONSUMIDOR_FINAL",
  "NO_RESPONSABLE",
] as const;

export interface OnboardArgs {
  nombre: string;
  cuit: string;
  condicionIva: (typeof CONDICION_IVA_VALUES)[number];
  direccion: string;
  email: string;
  password: string;
  subdominio: string;
}

export interface OnboardEnv {
  neonApiKey: string;
  vercelToken: string;
  githubToken: string;
}

export function parseArgs(argv: string[]): OnboardArgs {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }

  const required = ["nombre", "cuit", "condicionIva", "direccion", "email", "password", "subdominio"];
  const missing = required.filter((k) => !args[k]);
  if (missing.length > 0) {
    throw new Error(
      `Argumentos faltantes: ${missing.map((k) => `--${k}`).join(", ")}\n\n` +
        `Uso: npx tsx scripts/onboard-client.ts \\\n` +
        `  --nombre="Mi Negocio" --cuit="20-12345678-9" --condicionIva="MONOTRIBUTO" \\\n` +
        `  --direccion="Puesto 42" --email="admin@mail.com" --password="pass123" \\\n` +
        `  --subdominio="minegocio"`
    );
  }

  if (!/^\d{2}-\d{8}-\d$/.test(args.cuit)) {
    throw new Error(`CUIT invalido: "${args.cuit}". Formato esperado: XX-XXXXXXXX-X`);
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(args.subdominio) && !/^[a-z0-9]$/.test(args.subdominio)) {
    throw new Error(
      `Subdominio invalido: "${args.subdominio}". Solo letras minusculas, numeros y guiones. ` +
        `No puede empezar ni terminar con guion.`
    );
  }

  if (!CONDICION_IVA_VALUES.includes(args.condicionIva as any)) {
    throw new Error(
      `condicionIva invalida: "${args.condicionIva}". Valores validos: ${CONDICION_IVA_VALUES.join(", ")}`
    );
  }

  return {
    nombre: args.nombre,
    cuit: args.cuit,
    condicionIva: args.condicionIva as OnboardArgs["condicionIva"],
    direccion: args.direccion,
    email: args.email,
    password: args.password,
    subdominio: args.subdominio,
  };
}

export function loadEnv(): OnboardEnv {
  const required = {
    neonApiKey: process.env.NEON_API_KEY,
    vercelToken: process.env.VERCEL_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Faltan env vars del operador: ${missing.join(", ")}`);
  }

  return {
    neonApiKey: required.neonApiKey!,
    vercelToken: required.vercelToken!,
    githubToken: required.githubToken!,
  };
}
