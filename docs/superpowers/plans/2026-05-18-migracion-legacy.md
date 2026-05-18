# Migración Legacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Script CLI que importa datos maestros (productos, clientes, proveedores) desde Excel/CSV a la DB del cliente, usando Claude API para mapear columnas automáticamente.

**Architecture:** Seis módulos en `scripts/migrate/` (args, reader, mapper, validator, importer) orquestados por `scripts/migrate-legacy.ts`. El reader usa `xlsx` (SheetJS) para leer ambos formatos. El mapper envía headers + sample a Claude haiku para obtener un mapeo JSON de columnas. El validator chequea tipos, requeridos y enums. El importer inserta en orden de dependencias FK: categorías → unidades → productos → clientes → proveedores.

**Tech Stack:** TypeScript, tsx, xlsx (SheetJS), @anthropic-ai/sdk, Prisma Client

**Spec:** `docs/superpowers/specs/2026-05-18-migracion-legacy-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/migrate/args.ts` | Parsea argv, valida --target + al menos un archivo, verifica que archivos existen y son .xlsx/.csv |
| `scripts/migrate/reader.ts` | Lee .xlsx y .csv via SheetJS, devuelve `{ headers: string[], rows: Record<string, string>[] }` |
| `scripts/migrate/mapper.ts` | Llama a Claude haiku con headers + sample + schema destino, devuelve mapeo `{ columnaOrigen → campoDestino }` |
| `scripts/migrate/validator.ts` | Valida filas mapeadas: campos requeridos presentes, números parsean, enums válidos. Devuelve filas válidas + errores |
| `scripts/migrate/importer.ts` | PrismaClient apuntando a target DB. Inserta categorías, unidades, productos, clientes, proveedores con manejo de saldos y stock |
| `scripts/migrate-legacy.ts` | Orquestador: parsea args → lee archivos → mapea columnas → muestra mapeo → confirma → valida → importa → reporta |

---

### Task 1: Install xlsx dependency and args module

**Files:**
- Create: `scripts/migrate/args.ts`

- [ ] **Step 1: Install xlsx**

Run: `npm install xlsx`

- [ ] **Step 2: Create args module**

```ts
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
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsx --eval "import { parseArgs } from './scripts/migrate/args'; try { parseArgs([]); } catch(e) { console.log('OK:', e.message.substring(0, 30)); }"`

Expected: `OK: Falta --target (connection st`

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate/args.ts package.json package-lock.json
git commit -m "feat(migrate): args module + xlsx dependency"
```

---

### Task 2: Reader module

**Files:**
- Create: `scripts/migrate/reader.ts`

- [ ] **Step 1: Create reader module**

```ts
// scripts/migrate/reader.ts
import * as XLSX from "xlsx";

export interface FileData {
  headers: string[];
  rows: Record<string, string>[];
}

export function readFile(filePath: string): FileData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Archivo vacío: ${filePath}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (raw.length < 2) {
    throw new Error(
      `Archivo sin datos: ${filePath} (solo ${raw.length} fila(s))`
    );
  }

  const headers = raw[0].map((h) => String(h).trim()).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row: Record<string, string> = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = String(raw[i][j] ?? "").trim();
      row[headers[j]] = val;
      if (val) hasData = true;
    }
    if (hasData) rows.push(row);
  }

  return { headers, rows };
}

export function getSample(data: FileData, count: number = 5): Record<string, string>[] {
  return data.rows.slice(0, count);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { readFile, getSample } from './scripts/migrate/reader'; console.log('OK: reader imported')"`

Expected: `OK: reader imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate/reader.ts
git commit -m "feat(migrate): reader module — read xlsx and csv via SheetJS"
```

---

### Task 3: Mapper module (Claude API)

**Files:**
- Create: `scripts/migrate/mapper.ts`

- [ ] **Step 1: Create mapper module**

```ts
// scripts/migrate/mapper.ts
import Anthropic from "@anthropic-ai/sdk";

export type EntityType = "productos" | "clientes" | "proveedores";

export interface ColumnMapping {
  mapping: Record<string, string>;
  unmapped: string[];
  missingRequired: string[];
}

interface FieldSpec {
  description: string;
  type: string;
  required: boolean;
}

const ENTITY_SCHEMAS: Record<EntityType, Record<string, FieldSpec>> = {
  productos: {
    codigo: { description: "Código único del producto", type: "string", required: true },
    nombre: { description: "Nombre o descripción del producto", type: "string", required: true },
    categoria: { description: "Categoría o rubro del producto", type: "string", required: true },
    unidad: { description: "Unidad de medida (Kg, Un, Cj, Lt, etc.)", type: "string", required: true },
    precioVenta: { description: "Precio de venta al público", type: "número", required: true },
    precioCompra: { description: "Precio de compra o costo", type: "número", required: false },
    stockInicial: { description: "Stock actual o inicial", type: "número", required: false },
    stockMinimo: { description: "Stock mínimo de alerta", type: "número", required: false },
  },
  clientes: {
    nombreRazonSocial: { description: "Nombre completo o razón social", type: "string", required: true },
    documento: { description: "Número de documento (DNI, CUIT, CUIL)", type: "string", required: true },
    tipoDocumento: { description: "Tipo de documento: CUIT, CUIL, DNI, PASAPORTE, OTRO", type: "enum", required: false },
    condicionIva: { description: "Condición ante IVA: RESPONSABLE_INSCRIPTO, MONOTRIBUTO, EXENTO, CONSUMIDOR_FINAL, NO_RESPONSABLE", type: "enum", required: false },
    direccion: { description: "Dirección o domicilio", type: "string", required: false },
    localidad: { description: "Localidad o ciudad", type: "string", required: false },
    provincia: { description: "Provincia", type: "string", required: false },
    telefono: { description: "Teléfono de contacto", type: "string", required: false },
    email: { description: "Email de contacto", type: "string", required: false },
    maxCredito: { description: "Límite de crédito máximo", type: "número", required: false },
    saldoInicial: { description: "Saldo inicial de cuenta corriente (deuda)", type: "número", required: false },
  },
  proveedores: {
    nombreRazonSocial: { description: "Nombre completo o razón social", type: "string", required: true },
    documento: { description: "Número de documento (CUIT)", type: "string", required: true },
    tipoDocumento: { description: "Tipo de documento: CUIT, CUIL, DNI, PASAPORTE, OTRO", type: "enum", required: false },
    condicionIva: { description: "Condición ante IVA: RESPONSABLE_INSCRIPTO, MONOTRIBUTO, EXENTO, CONSUMIDOR_FINAL, NO_RESPONSABLE", type: "enum", required: false },
    direccion: { description: "Dirección o domicilio", type: "string", required: false },
    localidad: { description: "Localidad o ciudad", type: "string", required: false },
    provincia: { description: "Provincia", type: "string", required: false },
    telefono: { description: "Teléfono de contacto", type: "string", required: false },
    email: { description: "Email de contacto", type: "string", required: false },
    saldoInicial: { description: "Saldo inicial de cuenta corriente", type: "número", required: false },
  },
};

export async function mapColumns(
  apiKey: string,
  entity: EntityType,
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnMapping> {
  const schema = ENTITY_SCHEMAS[entity];
  const fieldsDescription = Object.entries(schema)
    .map(([name, spec]) => `- ${name} (${spec.type}${spec.required ? ", REQUERIDO" : ""}): ${spec.description}`)
    .join("\n");

  const sampleText = sampleRows
    .map((row, i) => `Fila ${i + 1}: ${JSON.stringify(row)}`)
    .join("\n");

  const prompt = `Tengo un archivo con datos de ${entity} que necesito importar. Analiza las columnas del archivo y mapéalas a los campos destino.

Columnas del archivo: ${JSON.stringify(headers)}

Primeras filas de ejemplo:
${sampleText}

Campos destino disponibles:
${fieldsDescription}

Responde SOLO con un JSON válido (sin markdown, sin explicación) con esta estructura:
{
  "mapping": { "nombre_columna_origen": "campo_destino", ... },
  "unmapped": ["columnas_que_no_mapeaste"]
}

Reglas:
- Cada columna origen puede mapearse a máximo un campo destino
- Cada campo destino puede recibir máximo una columna origen
- Si una columna no corresponde a ningún campo, ponela en "unmapped"
- Usá los nombres exactos de los campos destino`;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: { mapping: Record<string, string>; unmapped: string[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude devolvió JSON inválido: ${text.substring(0, 200)}`);
  }

  const requiredFields = Object.entries(schema)
    .filter(([, spec]) => spec.required)
    .map(([name]) => name);

  const mappedDestinations = new Set(Object.values(parsed.mapping));
  const missingRequired = requiredFields.filter((f) => !mappedDestinations.has(f));

  return {
    mapping: parsed.mapping,
    unmapped: parsed.unmapped || [],
    missingRequired,
  };
}

export function formatMappingTable(mapping: Record<string, string>, unmapped: string[]): string {
  const lines: string[] = [];
  const entries = Object.entries(mapping);

  const maxSource = Math.max(...entries.map(([k]) => k.length), 16);
  const maxDest = Math.max(...entries.map(([, v]) => v.length), 14);

  lines.push(`  ${"┌" + "─".repeat(maxSource + 2) + "┬" + "─".repeat(maxDest + 2) + "┐"}`);
  lines.push(`  ${"│"} ${"Columna origen".padEnd(maxSource)} ${"│"} ${"Campo destino".padEnd(maxDest)} ${"│"}`);
  lines.push(`  ${"├" + "─".repeat(maxSource + 2) + "┼" + "─".repeat(maxDest + 2) + "┤"}`);

  for (const [source, dest] of entries) {
    lines.push(`  ${"│"} ${source.padEnd(maxSource)} ${"│"} ${dest.padEnd(maxDest)} ${"│"}`);
  }

  lines.push(`  ${"└" + "─".repeat(maxSource + 2) + "┴" + "─".repeat(maxDest + 2) + "┘"}`);

  if (unmapped.length > 0) {
    lines.push(`  Sin mapear: ${unmapped.map((u) => `"${u}"`).join(", ")}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { mapColumns, formatMappingTable } from './scripts/migrate/mapper'; console.log('OK: mapper imported')"`

Expected: `OK: mapper imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate/mapper.ts
git commit -m "feat(migrate): mapper module — AI column mapping via Claude API"
```

---

### Task 4: Validator module

**Files:**
- Create: `scripts/migrate/validator.ts`

- [ ] **Step 1: Create validator module**

```ts
// scripts/migrate/validator.ts

export interface ValidationResult {
  valid: Record<string, string>[];
  errors: { row: number; reason: string }[];
}

const CONDICION_IVA_VALUES = [
  "RESPONSABLE_INSCRIPTO",
  "MONOTRIBUTO",
  "EXENTO",
  "CONSUMIDOR_FINAL",
  "NO_RESPONSABLE",
];

const TIPO_DOCUMENTO_VALUES = ["CUIT", "CUIL", "DNI", "PASAPORTE", "OTRO"];

interface FieldRule {
  required: boolean;
  type: "string" | "number" | "enum";
  enumValues?: string[];
}

const ENTITY_RULES: Record<string, Record<string, FieldRule>> = {
  productos: {
    codigo: { required: true, type: "string" },
    nombre: { required: true, type: "string" },
    categoria: { required: true, type: "string" },
    unidad: { required: true, type: "string" },
    precioVenta: { required: true, type: "number" },
    precioCompra: { required: false, type: "number" },
    stockInicial: { required: false, type: "number" },
    stockMinimo: { required: false, type: "number" },
  },
  clientes: {
    nombreRazonSocial: { required: true, type: "string" },
    documento: { required: true, type: "string" },
    tipoDocumento: { required: false, type: "enum", enumValues: TIPO_DOCUMENTO_VALUES },
    condicionIva: { required: false, type: "enum", enumValues: CONDICION_IVA_VALUES },
    direccion: { required: false, type: "string" },
    localidad: { required: false, type: "string" },
    provincia: { required: false, type: "string" },
    telefono: { required: false, type: "string" },
    email: { required: false, type: "string" },
    maxCredito: { required: false, type: "number" },
    saldoInicial: { required: false, type: "number" },
  },
  proveedores: {
    nombreRazonSocial: { required: true, type: "string" },
    documento: { required: true, type: "string" },
    tipoDocumento: { required: false, type: "enum", enumValues: TIPO_DOCUMENTO_VALUES },
    condicionIva: { required: false, type: "enum", enumValues: CONDICION_IVA_VALUES },
    direccion: { required: false, type: "string" },
    localidad: { required: false, type: "string" },
    provincia: { required: false, type: "string" },
    telefono: { required: false, type: "string" },
    email: { required: false, type: "string" },
    saldoInicial: { required: false, type: "number" },
  },
};

export function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [source, dest] of Object.entries(mapping)) {
      if (row[source] !== undefined) {
        mapped[dest] = row[source];
      }
    }
    return mapped;
  });
}

export function validateRows(
  entity: string,
  rows: Record<string, string>[]
): ValidationResult {
  const rules = ENTITY_RULES[entity];
  if (!rules) throw new Error(`Entidad desconocida: ${entity}`);

  const valid: Record<string, string>[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2: header is row 1, data starts row 2
    let skip = false;

    for (const [field, rule] of Object.entries(rules)) {
      const val = row[field] ?? "";

      if (rule.required && !val) {
        errors.push({ row: rowNum, reason: `${field} vacío` });
        skip = true;
        break;
      }

      if (val && rule.type === "number" && isNaN(Number(val))) {
        errors.push({ row: rowNum, reason: `${field} no es número: "${val}"` });
        skip = true;
        break;
      }

      if (val && rule.type === "enum" && rule.enumValues) {
        const upper = val.toUpperCase().replace(/\s+/g, "_");
        if (!rule.enumValues.includes(upper) && !rule.enumValues.includes(val)) {
          errors.push({
            row: rowNum,
            reason: `${field} inválido: "${val}". Valores: ${rule.enumValues.join(", ")}`,
          });
          skip = true;
          break;
        }
      }
    }

    if (!skip) valid.push(row);
  }

  return { valid, errors };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { applyMapping, validateRows } from './scripts/migrate/validator'; console.log('OK: validator imported')"`

Expected: `OK: validator imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate/validator.ts
git commit -m "feat(migrate): validator module — validate mapped rows"
```

---

### Task 5: Importer module

**Files:**
- Create: `scripts/migrate/importer.ts`

- [ ] **Step 1: Create importer module**

```ts
// scripts/migrate/importer.ts
import { PrismaClient } from "@prisma/client";

export interface ImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
}

export interface ImportSummary {
  categorias?: number;
  unidades?: number;
  productos?: ImportResult;
  clientes?: ImportResult;
  proveedores?: ImportResult;
  cuentasCreadas?: number;
}

export async function importProductos(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  adminUserId: string
): Promise<{ categorias: number; unidades: number; result: ImportResult }> {
  const catNames = [...new Set(rows.map((r) => r.categoria).filter(Boolean))];
  const catMap = new Map<string, string>();
  for (const name of catNames) {
    const existing = await prisma.categoria.findFirst({ where: { nombre: name } });
    if (existing) {
      catMap.set(name, existing.id);
    } else {
      const created = await prisma.categoria.create({ data: { nombre: name } });
      catMap.set(name, created.id);
    }
  }

  const unitAbbrevs = [...new Set(rows.map((r) => r.unidad).filter(Boolean))];
  const unitMap = new Map<string, string>();
  for (const abbrev of unitAbbrevs) {
    const existing = await prisma.unidadMedida.findFirst({ where: { abreviatura: abbrev } });
    if (existing) {
      unitMap.set(abbrev, existing.id);
    } else {
      const created = await prisma.unidadMedida.create({
        data: { nombre: abbrev, abreviatura: abbrev },
      });
      unitMap.set(abbrev, created.id);
    }
  }

  const result: ImportResult = { imported: 0, skipped: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const categoriaId = catMap.get(row.categoria);
      const unidadBaseId = unitMap.get(row.unidad);
      if (!categoriaId || !unidadBaseId) {
        result.skipped.push({ row: rowNum, reason: "categoría o unidad no encontrada" });
        continue;
      }

      const stockInicial = Number(row.stockInicial || 0);

      const producto = await prisma.producto.create({
        data: {
          codigo: row.codigo,
          nombre: row.nombre,
          categoriaId,
          unidadBaseId,
          precioVenta: Number(row.precioVenta),
          precioCompra: Number(row.precioCompra || 0),
          stockTotal: stockInicial,
          stockMinimo: Number(row.stockMinimo || 0),
        },
      });

      if (stockInicial > 0) {
        await prisma.movimientoStock.create({
          data: {
            productoId: producto.id,
            tipo: "AJUSTE_POSITIVO",
            cantidad: stockInicial,
            stockAnterior: 0,
            stockPosterior: stockInicial,
            motivo: "Stock inicial — migración legacy",
            usuarioId: adminUserId,
          },
        });
      }

      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint")) {
        result.skipped.push({ row: rowNum, reason: `codigo duplicado "${row.codigo}"` });
      } else {
        result.skipped.push({ row: rowNum, reason: msg.substring(0, 80) });
      }
    }
  }

  return { categorias: catNames.length, unidades: unitAbbrevs.length, result };
}

export async function importClientes(
  prisma: PrismaClient,
  rows: Record<string, string>[]
): Promise<{ result: ImportResult; cuentasCreadas: number }> {
  const result: ImportResult = { imported: 0, skipped: [] };
  let cuentasCreadas = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const cliente = await prisma.cliente.create({
        data: {
          nombreRazonSocial: row.nombreRazonSocial,
          documento: row.documento,
          tipoDocumento: (row.tipoDocumento as any) || "DNI",
          condicionIva: (row.condicionIva as any) || "CONSUMIDOR_FINAL",
          direccion: row.direccion || null,
          localidad: row.localidad || null,
          provincia: row.provincia || null,
          telefono: row.telefono || null,
          email: row.email || null,
          maxCredito: row.maxCredito ? Number(row.maxCredito) : null,
          saldoInicial: Number(row.saldoInicial || 0),
        },
      });

      const saldo = Number(row.saldoInicial || 0);
      if (saldo !== 0) {
        await prisma.cuenta.create({
          data: {
            nombre: `CC ${row.nombreRazonSocial}`,
            tipo: "CORRIENTE",
            titular: "CLIENTE",
            clienteId: cliente.id,
            saldo,
          },
        });
        cuentasCreadas++;
      }

      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint")) {
        result.skipped.push({ row: rowNum, reason: `documento duplicado "${row.documento}"` });
      } else {
        result.skipped.push({ row: rowNum, reason: msg.substring(0, 80) });
      }
    }
  }

  return { result, cuentasCreadas };
}

export async function importProveedores(
  prisma: PrismaClient,
  rows: Record<string, string>[]
): Promise<{ result: ImportResult; cuentasCreadas: number }> {
  const result: ImportResult = { imported: 0, skipped: [] };
  let cuentasCreadas = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const proveedor = await prisma.proveedor.create({
        data: {
          nombreRazonSocial: row.nombreRazonSocial,
          documento: row.documento,
          tipoDocumento: (row.tipoDocumento as any) || "CUIT",
          condicionIva: (row.condicionIva as any) || "RESPONSABLE_INSCRIPTO",
          direccion: row.direccion || null,
          localidad: row.localidad || null,
          provincia: row.provincia || null,
          telefono: row.telefono || null,
          email: row.email || null,
          saldoInicial: Number(row.saldoInicial || 0),
        },
      });

      const saldo = Number(row.saldoInicial || 0);
      if (saldo !== 0) {
        await prisma.cuenta.create({
          data: {
            nombre: `CC ${row.nombreRazonSocial}`,
            tipo: "CORRIENTE",
            titular: "PROVEEDOR",
            proveedorId: proveedor.id,
            saldo,
          },
        });
        cuentasCreadas++;
      }

      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint")) {
        result.skipped.push({ row: rowNum, reason: `documento duplicado "${row.documento}"` });
      } else {
        result.skipped.push({ row: rowNum, reason: msg.substring(0, 80) });
      }
    }
  }

  return { result, cuentasCreadas };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { importProductos, importClientes, importProveedores } from './scripts/migrate/importer'; console.log('OK: importer imported')"`

Expected: `OK: importer imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate/importer.ts
git commit -m "feat(migrate): importer module — insert categorías, unidades, productos, clientes, proveedores"
```

---

### Task 6: Orchestrator

**Files:**
- Create: `scripts/migrate-legacy.ts`
- Modify: `package.json` — add npm script

- [ ] **Step 1: Create main orchestrator**

```ts
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
```

- [ ] **Step 2: Verify it compiles and shows usage on missing args**

Run: `npx tsx scripts/migrate-legacy.ts 2>&1; echo "exit: $?"`

Expected: prints error about missing `--target` and exits.

- [ ] **Step 3: Add npm script to package.json**

In `package.json`, add to `"scripts"`:
```json
"migrate-legacy": "tsx scripts/migrate-legacy.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-legacy.ts package.json
git commit -m "feat(migrate): main orchestrator — full legacy migration pipeline"
```

---

### Task 7: Env vars and documentation

**Files:**
- Modify: `.env` — add ANTHROPIC_API_KEY
- Modify: `scripts/README.md` — add migration section

- [ ] **Step 1: Add env var to .env**

Append to the end of `.env`:
```
# Migración legacy
ANTHROPIC_API_KEY="<tu-api-key-de-anthropic>"
```

- [ ] **Step 2: Add migration section to scripts/README.md**

Append to the end of `scripts/README.md`:

````markdown

## Migración de datos legacy

### Prerrequisitos

1. DB del cliente ya creada via `npm run onboard`
2. Archivos de datos del cliente en formato `.xlsx` o `.csv`
3. Env var `ANTHROPIC_API_KEY` en `.env`

### Uso

```bash
npm run migrate-legacy -- \
  --target="postgresql://user:pass@host/db" \
  --productos="datos/productos.xlsx" \
  --clientes="datos/clientes.csv" \
  --proveedores="datos/proveedores.xlsx"
```

Los nombres de columnas en los archivos pueden ser cualquiera — la IA analiza los headers y propone un mapeo automáticamente. El operador confirma antes de importar.

### Argumentos

- `--target` (obligatorio): connection string de la DB del cliente
- `--productos`: archivo con productos (código, nombre, categoría, unidad, precios, stock)
- `--clientes`: archivo con clientes (nombre, documento, condición IVA, dirección, saldo)
- `--proveedores`: archivo con proveedores (nombre, documento, condición IVA, dirección, saldo)

Al menos uno de `--productos`, `--clientes` o `--proveedores` es obligatorio.
````

- [ ] **Step 3: Commit**

```bash
git add scripts/README.md
git commit -m "docs: migration legacy usage guide"
```

Note: `.env` is in `.gitignore` so it won't be committed — correct behavior.
