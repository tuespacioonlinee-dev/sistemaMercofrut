// Componente react-pdf — sin directiva "use client" ni "use server"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { CajaParaReporte, FilaStockResumido } from "@/server/actions/reportes"

const W = { id: 35, desc: 200, pres: 50, num: 60 } // 4 numéricas × 60 = 240 → total ≈ 525 ✓

const s = StyleSheet.create({
  page:    { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  header:  { marginBottom: 12 },
  title:   { fontSize: 14, fontWeight: "bold" },
  sub:     { fontSize: 9, color: "#555", marginTop: 3 },
  table:   { width: "100%" },
  row:     { flexDirection: "row" },
  th:      { padding: "3 5", fontWeight: "bold", fontSize: 7.5, backgroundColor: "#e9e9e9", borderBottom: "0.5 solid #bbb" },
  td:      { padding: "2 5", fontSize: 7.5 },
  tfoot:   { padding: "3 5", fontWeight: "bold", fontSize: 7.5, backgroundColor: "#f0f0f0", borderTop: "1 solid #999" },
  even:    { backgroundColor: "#fafafa" },
})

function fmt(n: number) {
  return n === 0
    ? "—"
    : n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}

interface Props { caja: CajaParaReporte; filas: FilaStockResumido[] }

export function StockResumidoPDF({ caja, filas }: Props) {
  const sum = (key: keyof FilaStockResumido) =>
    filas.reduce((a, f) => a + (f[key] as number), 0)

  const ahora = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  } as Intl.DateTimeFormatOptions)

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Reporte de Stock Resumido</Text>
          <Text style={s.sub}>
            Caja N° {caja.numero}  ·  {caja.estado}  ·{" "}
            {new Date(caja.fechaApertura).toLocaleDateString("es-AR")}
            {"   |   "}Generado: {ahora}
          </Text>
        </View>

        <View style={s.table}>
          {/* Cabecera */}
          <View style={s.row}>
            <Text style={[s.th, { width: W.id }]}>ID</Text>
            <Text style={[s.th, { width: W.desc }]}>Descripcion</Text>
            <Text style={[s.th, { width: W.pres }]}>Pres.</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right" }]}>Inicial</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", color: "#c0392b" }]}>Tot. Egresos</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", color: "#2471a3" }]}>Tot. Ingresos</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right" }]}>Final</Text>
          </View>

          {/* Filas */}
          {filas.map((f, i) => (
            <View key={f.productoId} style={[s.row, i % 2 === 0 ? s.even : {}]}>
              <Text style={[s.td, { width: W.id }]}>{f.codigo}</Text>
              <Text style={[s.td, { width: W.desc }]}>{f.descripcion}</Text>
              <Text style={[s.td, { width: W.pres }]}>{f.presentacion}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.stockInicial)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right", color: "#c0392b" }]}>{fmt(f.totalEgresos)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right", color: "#2471a3" }]}>{fmt(f.totalIngresos)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.stockFinal)}</Text>
            </View>
          ))}

          {/* Pie */}
          <View style={s.row}>
            <Text style={[s.tfoot, { width: W.id + W.desc + W.pres }]}>Total de Movimientos</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(sum("stockInicial"))}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right", color: "#c0392b" }]}>{fmt(sum("totalEgresos"))}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right", color: "#2471a3" }]}>{fmt(sum("totalIngresos"))}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(sum("stockFinal"))}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
