// scripts/validate/queries.ts
import type { PrismaClient } from "@prisma/client";
import { startOfDay, addDays } from "date-fns";

// --- Types ---

export interface CajaMovimiento {
  categoria: string;
  total: number;
}

export interface CajaData {
  encontrada: boolean;
  numero: number;
  estado: string;
  saldoInicial: number;
  movimientos: CajaMovimiento[];
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number | null;
  saldoArqueo: number | null;
}

export interface VentaRow {
  numero: number;
  cliente: string;
  condicion: string;
  total: number;
}

export interface VentasData {
  ventas: VentaRow[];
  subtotalContado: number;
  subtotalCC: number;
  totalGeneral: number;
}

export interface StockRow {
  codigo: string;
  nombre: string;
  stockAnterior: number;
  ingresos: number;
  egresos: number;
  stockActual: number;
}

export interface StockData {
  items: StockRow[];
}

export interface SaldoCCRow {
  cliente: string;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoActual: number;
}

export interface SaldosCCData {
  items: SaldoCCRow[];
}

export interface NegocioInfo {
  nombre: string;
}

// --- Helpers ---

function dateRange(fecha: Date) {
  const desde = startOfDay(fecha);
  const hasta = addDays(desde, 1);
  return { gte: desde, lt: hasta };
}

function dec(v: unknown): number {
  return Number(v);
}

const TIPOS_INGRESO = [
  "INGRESO_COMPRA",
  "AJUSTE_POSITIVO",
  "DEVOLUCION_CLIENTE",
  "INGRESO_SOBRANTE",
];

// --- Queries ---

export async function getNegocioInfo(
  prisma: PrismaClient
): Promise<NegocioInfo> {
  const params = await prisma.parametrosNegocio.findFirst();
  return { nombre: params?.nombreFantasia ?? "Mercofrut" };
}

export async function getCajaData(
  prisma: PrismaClient,
  fecha: Date
): Promise<CajaData> {
  const rango = dateRange(fecha);

  const caja = await prisma.cajaDiaria.findFirst({
    where: { fechaApertura: rango },
    include: {
      movimientos: {
        where: { deletedAt: null },
        select: { categoria: true, tipo: true, monto: true },
      },
    },
  });

  if (!caja) {
    return {
      encontrada: false,
      numero: 0,
      estado: "",
      saldoInicial: 0,
      movimientos: [],
      totalIngresos: 0,
      totalEgresos: 0,
      saldoFinal: null,
      saldoArqueo: null,
    };
  }

  const porCategoria = new Map<string, number>();
  let totalIngresos = 0;
  let totalEgresos = 0;

  for (const mov of caja.movimientos) {
    const monto = dec(mov.monto);
    const cat = mov.categoria as string;
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + monto);

    if (
      mov.tipo === "CONTADO_HABER" ||
      mov.tipo === "CC_HABER"
    ) {
      totalIngresos += monto;
    } else {
      totalEgresos += monto;
    }
  }

  const movimientos: CajaMovimiento[] = [];
  for (const [categoria, total] of porCategoria) {
    movimientos.push({ categoria, total });
  }

  return {
    encontrada: true,
    numero: caja.numero,
    estado: caja.estado,
    saldoInicial: dec(caja.saldoInicial),
    movimientos,
    totalIngresos,
    totalEgresos,
    saldoFinal: caja.saldoFinal != null ? dec(caja.saldoFinal) : null,
    saldoArqueo: caja.saldoArqueo != null ? dec(caja.saldoArqueo) : null,
  };
}

export async function getVentasData(
  prisma: PrismaClient,
  fecha: Date
): Promise<VentasData> {
  const rango = dateRange(fecha);

  const ventas = await prisma.venta.findMany({
    where: { fecha: rango, estado: "CONFIRMADA" },
    include: { cliente: { select: { nombreRazonSocial: true } } },
    orderBy: { numero: "asc" },
  });

  let subtotalContado = 0;
  let subtotalCC = 0;

  const rows: VentaRow[] = ventas.map((v) => {
    const total = dec(v.total);
    if (v.condicion === "CONTADO") subtotalContado += total;
    else subtotalCC += total;

    return {
      numero: v.numero,
      cliente: v.cliente.nombreRazonSocial,
      condicion: v.condicion,
      total,
    };
  });

  return {
    ventas: rows,
    subtotalContado,
    subtotalCC,
    totalGeneral: subtotalContado + subtotalCC,
  };
}

export async function getStockData(
  prisma: PrismaClient,
  fecha: Date
): Promise<StockData> {
  const rango = dateRange(fecha);

  const movimientos = await prisma.movimientoStock.findMany({
    where: { fecha: rango },
    include: {
      producto: {
        select: { codigo: true, nombre: true, stockTotal: true },
      },
    },
  });

  const porProducto = new Map<
    string,
    { codigo: string; nombre: string; stockActual: number; ingresos: number; egresos: number }
  >();

  for (const mov of movimientos) {
    const pid = mov.productoId;
    if (!porProducto.has(pid)) {
      porProducto.set(pid, {
        codigo: mov.producto.codigo,
        nombre: mov.producto.nombre,
        stockActual: dec(mov.producto.stockTotal),
        ingresos: 0,
        egresos: 0,
      });
    }
    const entry = porProducto.get(pid)!;
    const cant = dec(mov.cantidad);
    if (TIPOS_INGRESO.includes(mov.tipo)) {
      entry.ingresos += cant;
    } else {
      entry.egresos += cant;
    }
  }

  const items: StockRow[] = [];
  for (const entry of porProducto.values()) {
    const neto = entry.ingresos - entry.egresos;
    items.push({
      codigo: entry.codigo,
      nombre: entry.nombre,
      stockAnterior: entry.stockActual - neto,
      ingresos: entry.ingresos,
      egresos: entry.egresos,
      stockActual: entry.stockActual,
    });
  }

  items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { items };
}

export async function getSaldosCCData(
  prisma: PrismaClient,
  fecha: Date
): Promise<SaldosCCData> {
  const rango = dateRange(fecha);

  const movimientos = await prisma.movimientoCuenta.findMany({
    where: {
      fecha: rango,
      cuenta: { tipo: "CORRIENTE", titular: "CLIENTE" },
    },
    include: {
      cuenta: {
        select: {
          saldo: true,
          cliente: { select: { nombreRazonSocial: true } },
        },
      },
    },
  });

  const porCuenta = new Map<
    string,
    { cliente: string; saldoActual: number; debitos: number; creditos: number }
  >();

  for (const mov of movimientos) {
    const cid = mov.cuentaId;
    if (!porCuenta.has(cid)) {
      porCuenta.set(cid, {
        cliente: mov.cuenta.cliente?.nombreRazonSocial ?? "Sin cliente",
        saldoActual: dec(mov.cuenta.saldo),
        debitos: 0,
        creditos: 0,
      });
    }
    const entry = porCuenta.get(cid)!;
    const monto = dec(mov.monto);
    if (mov.tipo === "DEBE") entry.debitos += monto;
    else if (mov.tipo === "HABER") entry.creditos += monto;
  }

  const items: SaldoCCRow[] = [];
  for (const entry of porCuenta.values()) {
    const neto = entry.debitos - entry.creditos;
    items.push({
      cliente: entry.cliente,
      saldoAnterior: entry.saldoActual - neto,
      debitos: entry.debitos,
      creditos: entry.creditos,
      saldoActual: entry.saldoActual,
    });
  }

  items.sort((a, b) => a.cliente.localeCompare(b.cliente));
  return { items };
}
