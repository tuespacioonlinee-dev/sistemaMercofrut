# Validacion Paralelo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLI script that generates a PDF daily close report for validating parallel runs between the client's old system and Mercofrut.

**Architecture:** Modular script following the `scripts/migrate/` pattern: args parser, Prisma queries, React-PDF component, and an orchestrator. Connects to the client's DB via `--target` connection string, queries 4 data sections (caja, ventas, stock, saldos CC), and renders a PDF with `@react-pdf/renderer`.

**Tech Stack:** TypeScript, Prisma Client, @react-pdf/renderer (renderToBuffer), date-fns

**Spec:** `docs/superpowers/specs/2026-05-18-validacion-paralelo-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/validate/args.ts` | Parse and validate CLI arguments (--target, --fecha) |
| `scripts/validate/queries.ts` | 4 Prisma query functions: caja, ventas, stock, saldos CC |
| `scripts/validate/pdf.tsx` | React-PDF component `<CierreDiarioPDF>` with 4 sections |
| `scripts/validate-daily.ts` | Orchestrator: parse args → connect DB → query → render PDF → write file |

---

### Task 1: Args parser

**Files:**
- Create: `scripts/validate/args.ts`

- [ ] **Step 1: Create args parser**

```ts
// scripts/validate/args.ts

export interface ValidateArgs {
  target: string;
  fecha: Date;
}

export function parseArgs(argv: string[]): ValidateArgs {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }

  if (!args.target) {
    throw new Error(
      `Falta --target (connection string de la DB del cliente)\n\n` +
        `Uso: npx tsx scripts/validate-daily.ts \\\n` +
        `  --target="postgresql://user:pass@host/db" \\\n` +
        `  --fecha="2026-05-18"`
    );
  }

  let fecha = new Date();
  if (args.fecha) {
    const parsed = new Date(args.fecha + "T00:00:00");
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Fecha inválida: "${args.fecha}". Usar formato YYYY-MM-DD`
      );
    }
    fecha = parsed;
  }

  return { target: args.target, fecha };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { parseArgs } from './scripts/validate/args'; const r = parseArgs(['--target=postgresql://x', '--fecha=2026-05-18']); console.log('OK:', r.fecha.toISOString().slice(0,10))"`

Expected: `OK: 2026-05-18`

- [ ] **Step 3: Commit**

```bash
git add scripts/validate/args.ts
git commit -m "feat(validate): args parser for daily close validation script"
```

---

### Task 2: Prisma queries

**Files:**
- Create: `scripts/validate/queries.ts`

- [ ] **Step 1: Create queries module**

This file exports 4 functions. Each receives a PrismaClient and a Date, and returns typed data for one section of the PDF.

Key schema facts the implementer must know:
- `CajaDiaria.fechaApertura` is DateTime, `estado` is `ABIERTA`|`CERRADA`
- `MovimientoCaja` has `categoria` (CategoriaMovCaja enum: VENTA_CONTADO, COBRO_CLIENTE, PAGO_PROVEEDOR, COMPRA_CONTADO, GASTO, RETIRO, DEPOSITO, OTRO) and `tipo` (TipoMovCaja: CONTADO_DEBE, CONTADO_HABER, CC_DEBE, CC_HABER) and `monto` (Decimal)
- `Venta.fecha` is DateTime, `estado` is CONFIRMADA|PENDIENTE|ANULADA, `condicion` is CONTADO|CUENTA_CORRIENTE, `total` is Decimal
- `Venta` has relation `cliente` (Cliente with `nombreRazonSocial`) and `detalles` (DetalleVenta[])
- `MovimientoStock.fecha` is DateTime, `productoId`, `tipo` (TipoMovimientoStock), `cantidad` (Decimal)
- `Producto` has `codigo`, `nombre`, `stockTotal` (Decimal)
- Ingresos = tipos: INGRESO_COMPRA, AJUSTE_POSITIVO, DEVOLUCION_CLIENTE, INGRESO_SOBRANTE
- Egresos = tipos: EGRESO_VENTA, AJUSTE_NEGATIVO, DEVOLUCION_PROVEEDOR, EGRESO_MERMA, EGRESO_FALTANTE
- `MovimientoCuenta.fecha` is DateTime, `cuentaId`, `tipo` (DEBE|HABER|AJUSTE), `monto` (Decimal)
- `Cuenta` has `tipo` (CONTADO|CORRIENTE), `titular` (CLIENTE|PROVEEDOR|PROPIA), `saldo` (Decimal), relation `cliente` (Cliente), relation `movimientos`
- `ParametrosNegocio` has `nombreFantasia`, `razonSocial`

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { getCajaData, getVentasData, getStockData, getSaldosCCData, getNegocioInfo } from './scripts/validate/queries'; console.log('OK: queries imported')"`

Expected: `OK: queries imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/validate/queries.ts
git commit -m "feat(validate): Prisma queries for daily close report — caja, ventas, stock, saldos CC"
```

---

### Task 3: PDF component

**Files:**
- Create: `scripts/validate/pdf.tsx`

- [ ] **Step 1: Create PDF component**

Follow the existing pattern in `src/components/pdf/StockPDF.tsx`: same `StyleSheet.create` structure, same `$ar` currency formatter, same table layout with `thead` + alternating rows.

```tsx
// scripts/validate/pdf.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  CajaData,
  VentasData,
  StockData,
  SaldosCCData,
} from "./queries";

const s = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: { marginBottom: 20 },
  titulo: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  subtitulo: { fontSize: 9, color: "#666", marginTop: 2 },
  fecha: { fontSize: 8, color: "#999", marginTop: 1 },
  seccion: { marginTop: 20 },
  seccionTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tabla: { marginTop: 4 },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  thText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#475569",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  cell: { fontSize: 8.5 },
  vacio: { fontSize: 9, color: "#94a3b8", fontStyle: "italic", marginTop: 4 },
  totalesRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  totalLabel: {
    fontSize: 9,
    color: "#475569",
    marginRight: 8,
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
});

const $ar = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const $num = (n: number) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: 3 });

const CATEGORIA_LABELS: Record<string, string> = {
  VENTA_CONTADO: "Ventas contado",
  COBRO_CLIENTE: "Cobros a clientes",
  PAGO_PROVEEDOR: "Pagos a proveedores",
  COMPRA_CONTADO: "Compras contado",
  GASTO: "Gastos",
  RETIRO: "Retiros",
  DEPOSITO: "Depósitos",
  OTRO: "Otros",
};

interface Props {
  negocio: string;
  fecha: string;
  caja: CajaData;
  ventas: VentasData;
  stock: StockData;
  saldosCC: SaldosCCData;
}

export function CierreDiarioPDF({
  negocio,
  fecha,
  caja,
  ventas,
  stock,
  saldosCC,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.titulo}>Reporte de Cierre Diario</Text>
          <Text style={s.subtitulo}>{negocio}</Text>
          <Text style={s.fecha}>Fecha: {fecha}</Text>
        </View>

        {/* Sección 1: Caja */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Caja Diaria</Text>
          {!caja.encontrada ? (
            <Text style={s.vacio}>Sin caja registrada para esta fecha</Text>
          ) : (
            <View>
              <View style={s.tabla}>
                <View style={s.thead}>
                  <Text style={[s.thText, { flex: 2 }]}>Concepto</Text>
                  <Text style={[s.thText, { width: 100, textAlign: "right" }]}>
                    Monto
                  </Text>
                </View>
                <View style={s.row}>
                  <Text style={[s.cell, { flex: 2 }]}>Saldo inicial</Text>
                  <Text
                    style={[
                      s.cell,
                      { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    {$ar(caja.saldoInicial)}
                  </Text>
                </View>
                {caja.movimientos.map((mov, i) => (
                  <View
                    key={mov.categoria}
                    style={[s.row, i % 2 === 0 ? s.rowAlt : {}]}
                  >
                    <Text style={[s.cell, { flex: 2 }]}>
                      {CATEGORIA_LABELS[mov.categoria] ?? mov.categoria}
                    </Text>
                    <Text style={[s.cell, { width: 100, textAlign: "right" }]}>
                      {$ar(mov.total)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.totalesRow}>
                <Text style={s.totalLabel}>Ingresos: {$ar(caja.totalIngresos)}</Text>
                <Text style={s.totalLabel}>Egresos: {$ar(caja.totalEgresos)}</Text>
                {caja.saldoFinal != null && (
                  <Text style={s.totalLabel}>
                    Saldo final: {$ar(caja.saldoFinal)}
                  </Text>
                )}
                {caja.saldoArqueo != null && (
                  <Text style={s.totalValue}>
                    Arqueo: {$ar(caja.saldoArqueo)}
                  </Text>
                )}
              </View>
              <Text style={[s.fecha, { marginTop: 4 }]}>
                Estado: {caja.estado} | Caja #{caja.numero}
              </Text>
            </View>
          )}
        </View>

        {/* Sección 2: Ventas */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Ventas del Día</Text>
          {ventas.ventas.length === 0 ? (
            <Text style={s.vacio}>Sin ventas registradas</Text>
          ) : (
            <View>
              <View style={s.tabla}>
                <View style={s.thead}>
                  <Text style={[s.thText, { width: 40 }]}>N°</Text>
                  <Text style={[s.thText, { flex: 2 }]}>Cliente</Text>
                  <Text style={[s.thText, { width: 90 }]}>Condición</Text>
                  <Text style={[s.thText, { width: 80, textAlign: "right" }]}>
                    Total
                  </Text>
                </View>
                {ventas.ventas.map((v, i) => (
                  <View
                    key={v.numero}
                    style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}
                  >
                    <Text style={[s.cell, { width: 40, color: "#64748b" }]}>
                      {v.numero}
                    </Text>
                    <Text style={[s.cell, { flex: 2 }]}>{v.cliente}</Text>
                    <Text style={[s.cell, { width: 90, color: "#64748b" }]}>
                      {v.condicion === "CONTADO" ? "Contado" : "Cta. Cte."}
                    </Text>
                    <Text
                      style={[
                        s.cell,
                        { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      {$ar(v.total)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.totalesRow}>
                <Text style={s.totalLabel}>
                  Contado: {$ar(ventas.subtotalContado)}
                </Text>
                <Text style={s.totalLabel}>
                  Cta. Cte.: {$ar(ventas.subtotalCC)}
                </Text>
                <Text style={s.totalValue}>
                  Total: {$ar(ventas.totalGeneral)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Sección 3: Stock */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Stock con Movimiento</Text>
          {stock.items.length === 0 ? (
            <Text style={s.vacio}>Sin movimientos de stock</Text>
          ) : (
            <View style={s.tabla}>
              <View style={s.thead}>
                <Text style={[s.thText, { width: 55 }]}>Código</Text>
                <Text style={[s.thText, { flex: 2 }]}>Producto</Text>
                <Text style={[s.thText, { width: 60, textAlign: "right" }]}>
                  Anterior
                </Text>
                <Text style={[s.thText, { width: 55, textAlign: "right" }]}>
                  Ingr.
                </Text>
                <Text style={[s.thText, { width: 55, textAlign: "right" }]}>
                  Egr.
                </Text>
                <Text style={[s.thText, { width: 60, textAlign: "right" }]}>
                  Actual
                </Text>
              </View>
              {stock.items.map((item, i) => (
                <View
                  key={item.codigo}
                  style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}
                >
                  <Text
                    style={[
                      s.cell,
                      { width: 55, color: "#64748b", fontFamily: "Helvetica-Oblique" },
                    ]}
                  >
                    {item.codigo}
                  </Text>
                  <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>
                    {item.nombre}
                  </Text>
                  <Text style={[s.cell, { width: 60, textAlign: "right" }]}>
                    {$num(item.stockAnterior)}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      { width: 55, textAlign: "right", color: "#16a34a" },
                    ]}
                  >
                    {item.ingresos > 0 ? `+${$num(item.ingresos)}` : "-"}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      { width: 55, textAlign: "right", color: "#dc2626" },
                    ]}
                  >
                    {item.egresos > 0 ? `-${$num(item.egresos)}` : "-"}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      {
                        width: 60,
                        textAlign: "right",
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    {$num(item.stockActual)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sección 4: Saldos CC */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Saldos Cuenta Corriente</Text>
          {saldosCC.items.length === 0 ? (
            <Text style={s.vacio}>
              Sin movimientos de cuenta corriente
            </Text>
          ) : (
            <View style={s.tabla}>
              <View style={s.thead}>
                <Text style={[s.thText, { flex: 2 }]}>Cliente</Text>
                <Text style={[s.thText, { width: 70, textAlign: "right" }]}>
                  Anterior
                </Text>
                <Text style={[s.thText, { width: 65, textAlign: "right" }]}>
                  Débitos
                </Text>
                <Text style={[s.thText, { width: 65, textAlign: "right" }]}>
                  Créditos
                </Text>
                <Text style={[s.thText, { width: 70, textAlign: "right" }]}>
                  Actual
                </Text>
              </View>
              {saldosCC.items.map((item, i) => (
                <View
                  key={item.cliente}
                  style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}
                >
                  <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>
                    {item.cliente}
                  </Text>
                  <Text style={[s.cell, { width: 70, textAlign: "right" }]}>
                    {$ar(item.saldoAnterior)}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      { width: 65, textAlign: "right", color: "#dc2626" },
                    ]}
                  >
                    {$ar(item.debitos)}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      { width: 65, textAlign: "right", color: "#16a34a" },
                    ]}
                  >
                    {$ar(item.creditos)}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      {
                        width: 70,
                        textAlign: "right",
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    {$ar(item.saldoActual)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { CierreDiarioPDF } from './scripts/validate/pdf'; console.log('OK: PDF component imported')"`

Expected: `OK: PDF component imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/validate/pdf.tsx
git commit -m "feat(validate): React-PDF component for daily close report"
```

---

### Task 4: Orchestrator and npm script

**Files:**
- Create: `scripts/validate-daily.ts`
- Modify: `package.json` — add "validate" script
- Modify: `scripts/README.md` — add validation section

- [ ] **Step 1: Create orchestrator**

```ts
// scripts/validate-daily.ts
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseArgs } from "./validate/args";
import {
  getNegocioInfo,
  getCajaData,
  getVentasData,
  getStockData,
  getSaldosCCData,
} from "./validate/queries";
import { CierreDiarioPDF } from "./validate/pdf";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("\n=== Reporte de Cierre Diario ===\n");
  console.log(`Fecha: ${format(args.fecha, "dd/MM/yyyy", { locale: es })}`);
  console.log(`DB: ${args.target.replace(/:[^:@]+@/, ":***@")}\n`);

  const prisma = new PrismaClient({
    datasources: { db: { url: args.target } },
  });

  try {
    const [negocio, caja, ventas, stock, saldosCC] = await Promise.all([
      getNegocioInfo(prisma),
      getCajaData(prisma, args.fecha),
      getVentasData(prisma, args.fecha),
      getStockData(prisma, args.fecha),
      getSaldosCCData(prisma, args.fecha),
    ]);

    console.log(`Negocio: ${negocio.nombre}`);
    console.log(`Caja: ${caja.encontrada ? `#${caja.numero} (${caja.estado})` : "Sin caja"}`);
    console.log(`Ventas: ${ventas.ventas.length}`);
    console.log(`Productos con movimiento: ${stock.items.length}`);
    console.log(`Cuentas CC con movimiento: ${saldosCC.items.length}`);

    const fechaStr = format(args.fecha, "dd/MM/yyyy", { locale: es });

    const buffer = await renderToBuffer(
      <CierreDiarioPDF
        negocio={negocio.nombre}
        fecha={fechaStr}
        caja={caja}
        ventas={ventas}
        stock={stock}
        saldosCC={saldosCC}
      />
    );

    const filename = `cierre-diario-${format(args.fecha, "yyyy-MM-dd")}.pdf`;
    writeFileSync(filename, new Uint8Array(buffer));

    console.log(`\nPDF generado: ${filename}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Add to `package.json` scripts:
```json
"validate": "tsx scripts/validate-daily.ts"
```

- [ ] **Step 3: Add docs to README**

Add this section to `scripts/README.md` before the "Migración de datos legacy" section:

```markdown
## Validación de corrida en paralelo

### Uso

```bash
npm run validate -- \
  --target="postgresql://user:pass@host/db" \
  --fecha="2026-05-18"
```

### Argumentos

- `--target` (obligatorio): connection string de la DB del cliente
- `--fecha` (opcional): fecha del reporte en formato YYYY-MM-DD (default: hoy)

Genera un PDF `cierre-diario-YYYY-MM-DD.pdf` con 4 secciones:
1. Caja diaria (saldo inicial, movimientos por categoría, arqueo)
2. Ventas del día (listado con desglose contado vs CC)
3. Stock con movimiento (ingresos, egresos, stock anterior y actual)
4. Saldos cuenta corriente (débitos, créditos, saldo anterior y actual)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-daily.ts package.json scripts/README.md
git commit -m "feat(validate): daily close report orchestrator + npm script + docs"
```
