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
