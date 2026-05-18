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
