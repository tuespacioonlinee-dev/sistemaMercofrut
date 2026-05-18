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
