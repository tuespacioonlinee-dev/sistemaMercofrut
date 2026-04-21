import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 20 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitulo: { fontSize: 9, color: "#666", marginTop: 2 },
  fecha: { fontSize: 8, color: "#999", marginTop: 1 },
  tabla: { marginTop: 8 },
  thead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 4 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#475569" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4, paddingHorizontal: 4 },
  rowAlt: { backgroundColor: "#f8fafc" },
  rowAnulada: { opacity: 0.5 },
  cell: { fontSize: 8.5 },
  footer: { marginTop: 16, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  footerRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  footerLabel: { fontSize: 9, color: "#475569", marginRight: 8 },
  footerValue: { fontSize: 10, fontFamily: "Helvetica-Bold", width: 90, textAlign: "right" },
})

const $ar = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

type CompraItem = {
  fecha: string
  proveedor: string
  comprobante: string | null
  condicion: string
  total: number
  estado: string
}

interface Props {
  compras: CompraItem[]
  periodo: string
  totalPeriodo: number
  fecha: string
}

const CONDICION: Record<string, string> = {
  CONTADO: "Contado",
  CUENTA_CORRIENTE: "Cta. Cte.",
}

export function ComprasPDF({ compras, periodo, totalPeriodo, fecha }: Props) {
  const recibidas = compras.filter((c) => c.estado !== "ANULADA")
  const totalRecibidas = recibidas.reduce((acc, c) => acc + c.total, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.titulo}>Reporte de Compras</Text>
          <Text style={s.subtitulo}>Sistema Cono — Mercofrut Tucumán · {periodo}</Text>
          <Text style={s.fecha}>Generado el {fecha}</Text>
        </View>

        <View style={s.tabla}>
          <View style={s.thead}>
            <Text style={[s.thText, { width: 60 }]}>Fecha</Text>
            <Text style={[s.thText, { flex: 2 }]}>Proveedor</Text>
            <Text style={[s.thText, { flex: 1 }]}>Comprobante</Text>
            <Text style={[s.thText, { width: 55 }]}>Condición</Text>
            <Text style={[s.thText, { width: 80, textAlign: "right" }]}>Total</Text>
            <Text style={[s.thText, { width: 55, textAlign: "center" }]}>Estado</Text>
          </View>

          {compras.map((c, i) => (
            <View key={i} style={[s.row, i % 2 === 1 ? s.rowAlt : {}, c.estado === "ANULADA" ? s.rowAnulada : {}]}>
              <Text style={[s.cell, { width: 60, color: "#64748b" }]}>{c.fecha}</Text>
              <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{c.proveedor}</Text>
              <Text style={[s.cell, { flex: 1, color: "#64748b", fontFamily: "Helvetica-Oblique" }]}>
                {c.comprobante ?? "—"}
              </Text>
              <Text style={[s.cell, { width: 55, color: "#64748b" }]}>{CONDICION[c.condicion] ?? c.condicion}</Text>
              <Text style={[s.cell, { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{$ar(c.total)}</Text>
              <Text style={[s.cell, { width: 55, textAlign: "center", color: c.estado === "ANULADA" ? "#dc2626" : "#16a34a" }]}>
                {c.estado}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Total período ({compras.length} compras):</Text>
            <Text style={s.footerValue}>{$ar(totalPeriodo)}</Text>
          </View>
          {compras.some((c) => c.estado === "ANULADA") && (
            <View style={s.footerRow}>
              <Text style={[s.footerLabel, { color: "#16a34a" }]}>Total recibidas ({recibidas.length}):</Text>
              <Text style={[s.footerValue, { color: "#16a34a" }]}>{$ar(totalRecibidas)}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
