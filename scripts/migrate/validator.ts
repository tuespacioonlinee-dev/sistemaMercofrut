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
    const rowNum = i + 2;
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
