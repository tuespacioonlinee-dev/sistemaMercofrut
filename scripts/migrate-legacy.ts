// scripts/migrate-legacy.ts
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";
import { parseArgs, loadEnv } from "./migrate/args";
import { readFile, getSample } from "./migrate/reader";
import { mapColumns, formatMappingTable, type EntityType } from "./migrate/mapper";
import { applyMapping, validateRows } from "./migrate/validator";
import { importProductos, importClientes, importProveedores, type ImportSummary } from "./migrate/importer";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

interface FileAnalysis {
  entity: EntityType;
  filePath: string;
  data: { headers: string[]; rows: Record<string, string>[] };
  mapping: Record<string, string>;
  unmapped: string[];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  console.log("\n=== Migración Legacy ===\n");

  const files: { entity: EntityType; path: string }[] = [];
  if (args.productos) files.push({ entity: "productos", path: args.productos });
  if (args.clientes) files.push({ entity: "clientes", path: args.clientes });
  if (args.proveedores) files.push({ entity: "proveedores", path: args.proveedores });

  const analyses: FileAnalysis[] = [];

  for (const file of files) {
    console.log(`Archivo: ${file.path} (${file.entity})`);

    const data = readFile(file.path);
    console.log(`  Filas encontradas: ${data.rows.length}`);

    const sample = getSample(data);
    console.log(`  Analizando columnas con IA...`);

    const result = await mapColumns(env.anthropicApiKey, file.entity, data.headers, sample);

    console.log(`\n  Mapeo propuesto por IA:`);
    console.log(formatMappingTable(result.mapping, result.unmapped));

    if (result.missingRequired.length > 0) {
      console.error(
        `\n  ERROR: Campos requeridos sin mapeo: ${result.missingRequired.join(", ")}`
      );
      console.error(`  No se puede importar ${file.entity} de este archivo.\n`);
      continue;
    }

    analyses.push({
      entity: file.entity,
      filePath: file.path,
      data,
      mapping: result.mapping,
      unmapped: result.unmapped,
    });

    console.log();
  }

  if (analyses.length === 0) {
    console.error("No hay archivos válidos para importar.");
    process.exit(1);
  }

  const answer = await ask("¿Confirmar importación? (S/N): ");
  if (answer !== "S" && answer !== "SI") {
    console.log("Importación cancelada.");
    process.exit(0);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: args.target } },
  });

  const summary: ImportSummary = {};
  let totalCuentas = 0;

  try {
    const admin = await prisma.usuario.findFirst({ where: { rol: "ADMIN" } });
    if (!admin) {
      throw new Error("No se encontró usuario ADMIN en la DB destino. ¿Se corrió el onboarding?");
    }

    for (const analysis of analyses) {
      const mapped = applyMapping(analysis.data.rows, analysis.mapping);
      const validated = validateRows(analysis.entity, mapped);

      if (validated.errors.length > 0) {
        console.log(`\n  Filas inválidas en ${analysis.entity} (se saltarán):`);
        for (const err of validated.errors.slice(0, 10)) {
          console.log(`    Fila ${err.row}: ${err.reason}`);
        }
        if (validated.errors.length > 10) {
          console.log(`    ... y ${validated.errors.length - 10} más`);
        }
      }

      console.log(`\nImportando ${analysis.entity}...`);

      if (analysis.entity === "productos") {
        const res = await importProductos(prisma, validated.valid, admin.id);
        summary.categorias = res.categorias;
        summary.unidades = res.unidades;
        summary.productos = res.result;
        console.log(`  ${res.categorias} categorías creadas`);
        console.log(`  ${res.unidades} unidades de medida creadas`);
        console.log(`  ${res.result.imported} productos importados`);
        if (res.result.skipped.length > 0) {
          console.log(`  ${res.result.skipped.length} saltados:`);
          for (const s of res.result.skipped.slice(0, 5)) {
            console.log(`    Fila ${s.row}: ${s.reason}`);
          }
        }
      }

      if (analysis.entity === "clientes") {
        const res = await importClientes(prisma, validated.valid);
        summary.clientes = res.result;
        totalCuentas += res.cuentasCreadas;
        console.log(`  ${res.result.imported} clientes importados`);
        if (res.cuentasCreadas > 0) {
          console.log(`  ${res.cuentasCreadas} cuentas corrientes creadas`);
        }
        if (res.result.skipped.length > 0) {
          console.log(`  ${res.result.skipped.length} saltados:`);
          for (const s of res.result.skipped.slice(0, 5)) {
            console.log(`    Fila ${s.row}: ${s.reason}`);
          }
        }
      }

      if (analysis.entity === "proveedores") {
        const res = await importProveedores(prisma, validated.valid);
        summary.proveedores = res.result;
        totalCuentas += res.cuentasCreadas;
        console.log(`  ${res.result.imported} proveedores importados`);
        if (res.cuentasCreadas > 0) {
          console.log(`  ${res.cuentasCreadas} cuentas corrientes creadas`);
        }
        if (res.result.skipped.length > 0) {
          console.log(`  ${res.result.skipped.length} saltados:`);
          for (const s of res.result.skipped.slice(0, 5)) {
            console.log(`    Fila ${s.row}: ${s.reason}`);
          }
        }
      }
    }

    summary.cuentasCreadas = totalCuentas;

    console.log("\n=== Migración completada ===");
    if (summary.productos) {
      const total = summary.productos.imported + summary.productos.skipped.length;
      console.log(`  Productos: ${summary.productos.imported}/${total}`);
    }
    if (summary.clientes) {
      const total = summary.clientes.imported + summary.clientes.skipped.length;
      console.log(`  Clientes: ${summary.clientes.imported}/${total}`);
    }
    if (summary.proveedores) {
      const total = summary.proveedores.imported + summary.proveedores.skipped.length;
      console.log(`  Proveedores: ${summary.proveedores.imported}/${total}`);
    }
  } catch (err) {
    console.error("\n!!! Migración FALLÓ !!!");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
