// scripts/restore.ts
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { google } from "googleapis";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TABLES = [
  "Usuario",
  "Categoria",
  "UnidadMedida",
  "Producto",
  "ProductoUnidad",
  "LoteProducto",
  "MovimientoStock",
  "Cliente",
  "Proveedor",
  "Cuenta",
  "MovimientoCuenta",
  "CajaDiaria",
  "MovimientoCaja",
  "Venta",
  "DetalleVenta",
  "Compra",
  "DetalleCompra",
  "ParametrosComprobante",
  "Remito",
  "Factura",
  "ParametrosNegocio",
];

function printUsage() {
  console.log(`Uso: tsx scripts/restore.ts <fuente> --target=<connection_string>

Fuente:
  Fecha (YYYY-MM-DD)    Descarga de Drive el backup de ese dia
  Ruta local (.sql.gz)  Usa ese archivo directamente

Opciones:
  --target=<url>   Connection string de la DB destino (OBLIGATORIO)

Ejemplo:
  tsx scripts/restore.ts 2026-05-18 --target="postgresql://user:pass@host/db"
  tsx scripts/restore.ts ./mercofrut-2026-05-18-030000.sql.gz --target="postgresql://user:pass@host/db"
`);
}

async function downloadFromDrive(date: string): Promise<string> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!saJson || !folderId) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_JSON y/o GOOGLE_DRIVE_FOLDER_ID para descargar de Drive"
    );
  }

  const credentials = JSON.parse(saJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'mercofrut-${date}' and trashed = false`,
    fields: "files(id,name)",
    orderBy: "name desc",
    pageSize: 1,
  });

  const file = res.data.files?.[0];
  if (!file) {
    throw new Error(`No se encontro backup para la fecha ${date} en Drive`);
  }

  console.log(`Descargando ${file.name} de Drive...`);
  const outPath = join(tmpdir(), file.name!);

  const response = await drive.files.get(
    { fileId: file.id!, alt: "media" },
    { responseType: "stream" }
  );

  await new Promise<void>((resolve, reject) => {
    const dest = createWriteStream(outPath);
    (response.data as NodeJS.ReadableStream)
      .pipe(dest)
      .on("finish", resolve)
      .on("error", reject);
  });

  console.log(`Descargado a: ${outPath}`);
  return outPath;
}

function restore(filePath: string, targetUrl: string) {
  console.log(`Restaurando ${filePath} en la DB destino...`);
  execSync(`gunzip -c "${filePath}" | psql "${targetUrl}"`, {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10 * 60 * 1000, // 10 min max
  });
  console.log("Restore completado.");
}

function verify(targetUrl: string) {
  console.log("\nVerificacion:");

  const tableCheck = execSync(
    `psql "${targetUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"`,
    { encoding: "utf-8" }
  );
  const existingTables = tableCheck
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Prisma uses quoted PascalCase for table names
  const missing = TABLES.filter(
    (t) => !existingTables.includes(t) && !existingTables.includes(`"${t}"`)
  );
  if (missing.length > 0) {
    console.warn(`  ATENCION: tablas faltantes: ${missing.join(", ")}`);
  } else {
    console.log(`  Todas las ${TABLES.length} tablas presentes`);
  }

  console.log("\n  Conteo de registros:");
  for (const table of TABLES) {
    try {
      const count = execSync(
        `psql "${targetUrl}" -t -c "SELECT count(*) FROM \\"${table}\\""`,
        { encoding: "utf-8" }
      ).trim();
      console.log(`    ${table}: ${count}`);
    } catch {
      console.log(`    ${table}: ERROR al contar`);
    }
  }

  console.log("\n=== Restore OK ===");
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--target="));
  const source = args.find((a) => !a.startsWith("--"));

  if (!source || !targetArg) {
    printUsage();
    process.exit(1);
  }

  const targetUrl = targetArg.replace("--target=", "");
  let filePath: string;
  let downloaded = false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    filePath = await downloadFromDrive(source);
    downloaded = true;
  } else if (existsSync(source)) {
    filePath = source;
  } else {
    console.error(`No se encontro el archivo: ${source}`);
    process.exit(1);
  }

  try {
    restore(filePath, targetUrl);
    verify(targetUrl);
  } finally {
    if (downloaded) {
      try {
        unlinkSync(filePath);
      } catch {}
    }
  }
}

main();
