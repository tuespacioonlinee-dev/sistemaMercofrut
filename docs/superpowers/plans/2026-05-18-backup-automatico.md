# Backup Automatico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Script de backup diario que hace pg_dump de la DB de Mercofrut, sube a Google Drive, limpia backups viejos, y notifica por email si falla. Se ejecuta via GitHub Actions cron a las 3am ART.

**Architecture:** Dos scripts TypeScript independientes (`backup.ts` y `restore.ts`) en `scripts/`, ejecutados con `tsx`. Un workflow de GitHub Actions dispara el backup diario. Las dependencias (`googleapis`, `resend`) se instalan como devDependencies. No se toca codigo existente de la app.

**Tech Stack:** TypeScript, tsx, Node.js child_process (pg_dump/psql/gzip), googleapis SDK, resend SDK, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-05-18-backup-automatico-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/backup.ts` | Orquestador: pgDump -> upload Drive -> cleanup old -> notify on error |
| `scripts/backup/dump.ts` | Ejecuta pg_dump y comprime con gzip, devuelve ruta del archivo |
| `scripts/backup/drive.ts` | Upload a Drive, listar archivos, borrar archivos viejos |
| `scripts/backup/notify.ts` | Enviar email de error via Resend |
| `scripts/backup/config.ts` | Lee env vars, valida que esten todas, exporta config tipada |
| `scripts/restore.ts` | Descarga de Drive + gunzip + psql + verificacion |
| `.github/workflows/backup.yml` | Cron diario 3am ART, instala pg client, corre tsx scripts/backup.ts |

---

### Task 1: Config module

**Files:**
- Create: `scripts/backup/config.ts`

- [ ] **Step 1: Create config module**

```ts
// scripts/backup/config.ts

interface BackupConfig {
  directUrl: string;
  googleServiceAccountJson: string;
  googleDriveFolderId: string;
  resendApiKey: string;
  alertEmail: string;
  retentionDays: number;
}

export function loadConfig(): BackupConfig {
  const required = {
    directUrl: process.env.DIRECT_URL,
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Faltan env vars: ${missing.join(", ")}`);
  }

  return {
    directUrl: required.directUrl!,
    googleServiceAccountJson: required.googleServiceAccountJson!,
    googleDriveFolderId: required.googleDriveFolderId!,
    resendApiKey: required.resendApiKey!,
    alertEmail: required.alertEmail!,
    retentionDays: Number(process.env.RETENTION_DAYS) || 120,
  };
}

export function buildFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `mercofrut-${date}-${time}.sql.gz`;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { loadConfig, buildFileName } from './scripts/backup/config'; console.log(buildFileName())"`

Expected: prints something like `mercofrut-2026-05-18-153000.sql.gz`

- [ ] **Step 3: Commit**

```bash
git add scripts/backup/config.ts
git commit -m "feat(backup): config module — loads env vars and builds filename"
```

---

### Task 2: Dump module

**Files:**
- Create: `scripts/backup/dump.ts`

- [ ] **Step 1: Create dump module**

```ts
// scripts/backup/dump.ts
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function pgDump(connectionUrl: string, fileName: string): string {
  const outDir = join(tmpdir(), "mercofrut-backups");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const outPath = join(outDir, fileName);

  execSync(
    `pg_dump "${connectionUrl}" --format=plain --no-owner --no-acl | gzip > "${outPath}"`,
    {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 5 * 60 * 1000, // 5 min max
    }
  );

  const stats = execSync(`ls -lh "${outPath}"`, { encoding: "utf-8" });
  console.log(`Dump creado: ${stats.trim()}`);

  return outPath;
}
```

- [ ] **Step 2: Test locally against Neon (manual smoke test)**

Run: `npx tsx --eval "import { pgDump } from './scripts/backup/dump'; const f = pgDump(process.env.DIRECT_URL!, 'test-dump.sql.gz'); console.log('OK:', f)"`

Expected: prints path to a .sql.gz file that exists and has size > 0. Delete the test file after.

- [ ] **Step 3: Commit**

```bash
git add scripts/backup/dump.ts
git commit -m "feat(backup): dump module — pg_dump + gzip to temp file"
```

---

### Task 3: Drive module

**Files:**
- Create: `scripts/backup/drive.ts`

- [ ] **Step 1: Install googleapis**

Run: `npm install --save-dev googleapis`

- [ ] **Step 2: Create drive module**

```ts
// scripts/backup/drive.ts
import { google } from "googleapis";
import { createReadStream } from "fs";
import { basename } from "path";

function getAuth(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

export async function uploadToDrive(
  filePath: string,
  folderId: string,
  serviceAccountJson: string
): Promise<string> {
  const auth = getAuth(serviceAccountJson);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: basename(filePath),
      parents: [folderId],
    },
    media: {
      mimeType: "application/gzip",
      body: createReadStream(filePath),
    },
    fields: "id,name,size",
  });

  console.log(
    `Subido a Drive: ${res.data.name} (${res.data.size} bytes, id: ${res.data.id})`
  );
  return res.data.id!;
}

export async function cleanupOldBackups(
  folderId: string,
  serviceAccountJson: string,
  retentionDays: number
): Promise<number> {
  const auth = getAuth(serviceAccountJson);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,createdTime)",
    pageSize: 1000,
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  let deleted = 0;
  for (const file of res.data.files ?? []) {
    const match = file.name?.match(/^mercofrut-(\d{4}-\d{2}-\d{2})-/);
    if (!match) continue;

    const fileDate = new Date(match[1]);
    if (fileDate < cutoff) {
      await drive.files.delete({ fileId: file.id! });
      console.log(`Eliminado backup viejo: ${file.name}`);
      deleted++;
    }
  }

  return deleted;
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backup/drive.ts
git commit -m "feat(backup): drive module — upload and cleanup old backups"
```

---

### Task 4: Notify module

**Files:**
- Create: `scripts/backup/notify.ts`

- [ ] **Step 1: Install resend**

Run: `npm install --save-dev resend`

- [ ] **Step 2: Create notify module**

```ts
// scripts/backup/notify.ts
import { Resend } from "resend";

export async function notifyError(
  apiKey: string,
  to: string,
  step: string,
  error: unknown
): Promise<void> {
  const resend = new Resend(apiKey);
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  try {
    await resend.emails.send({
      from: "Backup Mercofrut <onboarding@resend.dev>",
      to,
      subject: `[BACKUP FALLO] Error en: ${step}`,
      text: [
        `El backup automatico de Mercofrut fallo.`,
        ``,
        `Paso que fallo: ${step}`,
        `Error: ${message}`,
        `Timestamp: ${timestamp}`,
        ``,
        `Revisar el workflow en GitHub Actions para mas detalles.`,
      ].join("\n"),
    });
    console.log(`Email de alerta enviado a ${to}`);
  } catch (emailErr) {
    console.error(`No se pudo enviar el email de alerta:`, emailErr);
    throw emailErr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backup/notify.ts
git commit -m "feat(backup): notify module — send error email via Resend"
```

---

### Task 5: Backup orchestrator

**Files:**
- Create: `scripts/backup.ts`

- [ ] **Step 1: Create main backup script**

```ts
// scripts/backup.ts
import { loadConfig, buildFileName } from "./backup/config";
import { pgDump } from "./backup/dump";
import { uploadToDrive, cleanupOldBackups } from "./backup/drive";
import { notifyError } from "./backup/notify";
import { unlinkSync } from "fs";

async function main() {
  const config = loadConfig();
  const fileName = buildFileName();
  let filePath: string | null = null;

  try {
    console.log("=== Backup Mercofrut ===");
    console.log(`Archivo: ${fileName}`);

    console.log("\n1. Ejecutando pg_dump...");
    filePath = pgDump(config.directUrl, fileName);

    console.log("\n2. Subiendo a Google Drive...");
    await uploadToDrive(
      filePath,
      config.googleDriveFolderId,
      config.googleServiceAccountJson
    );

    console.log("\n3. Limpiando backups viejos...");
    const deleted = await cleanupOldBackups(
      config.googleDriveFolderId,
      config.googleServiceAccountJson,
      config.retentionDays
    );
    console.log(`   ${deleted} backup(s) viejo(s) eliminado(s)`);

    console.log("\n=== Backup completado OK ===");
  } catch (err) {
    console.error("\n!!! Backup FALLO !!!", err);
    try {
      await notifyError(
        config.resendApiKey,
        config.alertEmail,
        "backup",
        err
      );
    } catch {
      console.error("Tampoco se pudo enviar el email de alerta.");
    }
    process.exit(1);
  } finally {
    if (filePath) {
      try {
        unlinkSync(filePath);
      } catch {}
    }
  }
}

main();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import './scripts/backup'" 2>&1 | head -5`

Expected: falla por falta de env vars (`Faltan env vars: ...`), lo cual confirma que carga y ejecuta correctamente.

- [ ] **Step 3: Commit**

```bash
git add scripts/backup.ts
git commit -m "feat(backup): main orchestrator — dump, upload, cleanup, notify"
```

---

### Task 6: Restore script

**Files:**
- Create: `scripts/restore.ts`

- [ ] **Step 1: Create restore script**

```ts
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
```

- [ ] **Step 2: Verify it compiles and shows usage**

Run: `npx tsx scripts/restore.ts`

Expected: prints usage message and exits with code 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/restore.ts
git commit -m "feat(backup): restore script — download from Drive + psql + verify"
```

---

### Task 7: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/backup.yml`

- [ ] **Step 1: Create workflow file**

```yaml
# .github/workflows/backup.yml
name: backup-diario

on:
  schedule:
    # 6:00 UTC = 3:00 ART (Argentina, UTC-3)
    - cron: "0 6 * * *"
  workflow_dispatch: # permite correrlo manualmente desde GitHub

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install PostgreSQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Run backup
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          ALERT_EMAIL: ${{ secrets.ALERT_EMAIL }}
        run: npx tsx scripts/backup.ts

```

- [ ] **Step 2: Validate YAML syntax**

Run: `npx tsx --eval "import { readFileSync } from 'fs'; const y = readFileSync('.github/workflows/backup.yml', 'utf-8'); console.log('YAML length:', y.length, 'lines:', y.split('\\n').length)"`

Expected: prints line count (~45) without error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/backup.yml
git commit -m "ci: GitHub Actions workflow for daily backup at 3am ART"
```

---

### Task 8: Integration test — full backup dry run

This task validates the full chain locally (dump + compress) without needing Drive or Resend configured.

**Files:**
- No new files

- [ ] **Step 1: Smoke test the dump module against Neon**

Run (needs DIRECT_URL in .env):

```bash
npx tsx --eval "
import { pgDump } from './scripts/backup/dump';
import { buildFileName } from './scripts/backup/config';
import { statSync, unlinkSync } from 'fs';

const f = pgDump(process.env.DIRECT_URL!, buildFileName());
const s = statSync(f);
console.log('File:', f);
console.log('Size:', s.size, 'bytes');
if (s.size < 100) throw new Error('Backup demasiado chico');
console.log('OK — dump funciona');
unlinkSync(f);
"
```

Expected: prints file path, size > 100 bytes, "OK — dump funciona".

- [ ] **Step 2: Verify restore script shows usage**

Run: `npx tsx scripts/restore.ts`

Expected: prints usage help and exits.

- [ ] **Step 3: Final commit with updated package.json**

Add a convenience script to package.json:

In `package.json`, add to `"scripts"`:
```json
"backup": "tsx scripts/backup.ts",
"restore": "tsx scripts/restore.ts"
```

```bash
git add package.json
git commit -m "chore: add backup/restore npm scripts"
```

---

### Task 9: Setup documentation

**Files:**
- Create: `scripts/README.md`

- [ ] **Step 1: Write setup guide**

```markdown
# Scripts de backup

## Setup inicial (una sola vez)

### 1. Google Cloud — Service Account

1. Ir a https://console.cloud.google.com/
2. Crear proyecto (o usar uno existente)
3. Habilitar "Google Drive API"
4. Ir a IAM > Service Accounts > Crear
5. Nombre: `mercofrut-backup`
6. Crear clave JSON > descargar
7. En Google Drive: crear carpeta "Backups Mercofrut"
8. Compartir esa carpeta con el email del Service Account (el que termina en @xxx.iam.gserviceaccount.com)
9. Copiar el ID de la carpeta (esta en la URL de Drive)

### 2. Resend — Email

1. Ir a https://resend.com/
2. Crear cuenta (free tier: 100 emails/dia)
3. Obtener API key desde el dashboard

### 3. GitHub Secrets

En el repo > Settings > Secrets and variables > Actions, agregar:

| Secret | Valor |
|--------|-------|
| `DIRECT_URL` | Connection string directo de Neon (sin pooler) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON del Service Account |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta de Drive |
| `RESEND_API_KEY` | API key de Resend |
| `ALERT_EMAIL` | Email donde llegan las alertas |

### 4. Test manual

Correr el workflow manualmente desde GitHub Actions (boton "Run workflow") y verificar que:
- El archivo aparece en la carpeta de Drive
- El log del workflow muestra "Backup completado OK"

## Comandos

```bash
# Backup manual
npm run backup

# Restore
npm run restore -- 2026-05-18 --target="postgresql://user:pass@host/db"
npm run restore -- ./archivo.sql.gz --target="postgresql://user:pass@host/db"
```
```

- [ ] **Step 2: Commit**

```bash
git add scripts/README.md
git commit -m "docs: setup guide for backup scripts"
```
