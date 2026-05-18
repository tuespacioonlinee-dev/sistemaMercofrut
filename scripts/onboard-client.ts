// scripts/onboard-client.ts
import { parseArgs, loadEnv } from "./onboard/args";
import { createNeonProject } from "./onboard/neon";
import { runMigrations } from "./onboard/migrate";
import { seedClient } from "./onboard/seed";
import {
  createVercelProject,
  setEnvVars,
  addDomain,
  generateAuthSecret,
} from "./onboard/vercel";

const REPO = "tuespacioonlinee-dev/sistemaMercofrut";

interface CreatedResources {
  neonProjectId?: string;
  vercelProjectId?: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const projectName = `mercofrut-${args.subdominio}`;
  const domain = `${args.subdominio}.mercofrut.com`;
  const resources: CreatedResources = {};

  let step = "validacion";
  try {
    console.log(`\n=== Onboarding: ${args.nombre} ===\n`);

    step = "crear proyecto en Neon";
    console.log("1. Creando proyecto en Neon...");
    const neon = await createNeonProject(env.neonApiKey, projectName);
    resources.neonProjectId = neon.projectId;
    console.log(`   Proyecto: ${projectName} (id: ${neon.projectId})`);
    console.log(`   DB URL: ${neon.poolerUrl.replace(/:[^:@]+@/, ":***@")}`);

    step = "correr migraciones";
    console.log("\n2. Corriendo migraciones...");
    runMigrations(neon.directUrl);

    step = "seed de datos del cliente";
    console.log("\n3. Creando usuario admin y parametros...");
    await seedClient(neon.directUrl, args);

    step = "crear proyecto en Vercel";
    console.log("\n4. Creando proyecto en Vercel...");
    const vercel = await createVercelProject(
      env.vercelToken,
      env.githubToken,
      projectName,
      REPO
    );
    resources.vercelProjectId = vercel.projectId;
    console.log(`   Proyecto: ${vercel.projectName} (id: ${vercel.projectId})`);

    step = "configurar env vars en Vercel";
    console.log("\n5. Configurando env vars...");
    await setEnvVars(env.vercelToken, vercel.projectId, {
      DATABASE_URL: neon.poolerUrl,
      DIRECT_URL: neon.directUrl,
      AUTH_SECRET: generateAuthSecret(),
      AUTH_URL: `https://${domain}`,
    });
    console.log("   4 variables configuradas");

    step = "configurar dominio";
    console.log("\n6. Configurando dominio...");
    await addDomain(env.vercelToken, vercel.projectId, domain);
    console.log(`   Dominio: ${domain}`);

    console.log(`\n=== Onboarding completado ===\n`);
    console.log(`URL:   https://${domain}`);
    console.log(`Login: ${args.email}`);
    console.log(`Pass:  ${args.password}`);
    console.log(`\nRecursos creados:`);
    console.log(`  Neon project: ${resources.neonProjectId}`);
    console.log(`  Vercel project: ${resources.vercelProjectId}`);
  } catch (err) {
    console.error(`\n!!! FALLO en paso: ${step} !!!`);
    console.error(err instanceof Error ? err.message : err);

    if (resources.neonProjectId || resources.vercelProjectId) {
      console.error(`\nRecursos creados (limpiar manualmente si es necesario):`);
      if (resources.neonProjectId) {
        console.error(`  Neon project: ${resources.neonProjectId}`);
      }
      if (resources.vercelProjectId) {
        console.error(`  Vercel project: ${resources.vercelProjectId}`);
      }
    }

    process.exit(1);
  }
}

main();
