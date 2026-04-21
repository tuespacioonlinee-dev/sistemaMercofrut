import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 20 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  subtitulo: { fontSize: 9, color: "#666", marginTop: 2 },
  fecha: { fontSize: 8, color: "#999", marginTop: 1 },
  tabla: { marginTop: 8 },
  thead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 4 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#475569" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4, paddingHorizontal: 4 },
  rowAlt: { backgroundColor: "#f8fafc" },
  cell: { fontSize: 8.5 },
  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  footer: { marginTop: 16, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", flexDirection: "row", justifyContent: "flex-end" },
  footerLabel: { fontSize: 9, color: "#475569", marginRight: 8 },
  footerValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
})

const $ar = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

type Item = {
  codigo: string
  nombre: string
  categoria: string
  stock: number
  unidad: string
  precioCompra: number
  valorStock: number
  bajoMinimo: boolean
  sinStock: boolean
}

interface Props {
  items: Item[]
  totalValorizado: number
  fecha: string
}

export function StockPDF({ items, totalValorizado, fecha }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.titulo}>Lista de Stock</Text>
          <Text style={s.subtitulo}>Sistema Cono — Mercofrut Tucumán</Text>
          <Text style={s.fecha}>Generado el {fecha}</Text>
        </View>

        <View style={s.tabla}>
          <View style={s.thead}>
            <Text style={[s.thText, { width: 55 }]}>Código</Text>
            <Text style={[s.thText, { flex: 2 }]}>Producto</Text>
            <Text style={[s.thText, { flex: 1 }]}>Categoría</Text>
            <Text style={[s.thText, { width: 60, textAlign: "right" }]}>Stock</Text>
            <Text style={[s.thText, { width: 35 }]}>Und.</Text>
            <Text style={[s.thText, { width: 75, textAlign: "right" }]}>P. Compra</Text>
            <Text style={[s.thText, { width: 80, textAlign: "right" }]}>Valor</Text>
            <Text style={[s.thText, { width: 55, textAlign: "center" }]}>Estado</Text>
          </View>

          {items.map((item, i) => (
            <View key={item.codigo} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
              <Text style={[s.cell, { width: 55, color: "#64748b", fontFamily: "Helvetica-Oblique" }]}>{item.codigo}</Text>
              <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{item.nombre}</Text>
              <Text style={[s.cell, { flex: 1, color: "#64748b" }]}>{item.categoria}</Text>
              <Text style={[s.cell, { width: 60, textAlign: "right", color: item.sinStock ? "#dc2626" : item.bajoMinimo ? "#d97706" : "#1a1a1a" }]}>
                {item.stock.toLocaleString("es-AR", { maximumFractionDigits: 3 })}
              </Text>
              <Text style={[s.cell, { width: 35, color: "#64748b" }]}>{item.unidad}</Text>
              <Text style={[s.cell, { width: 75, textAlign: "right", color: "#64748b" }]}>{$ar(item.precioCompra)}</Text>
              <Text style={[s.cell, { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{$ar(item.valorStock)}</Text>
              <Text style={[s.cell, { width: 55, textAlign: "center", color: item.sinStock ? "#dc2626" : item.bajoMinimo ? "#d97706" : "#16a34a" }]}>
                {item.sinStock ? "Sin stock" : item.bajoMinimo ? "Bajo mín." : "OK"}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerLabel}>Total valorizado:</Text>
          <Text style={s.footerValue}>{$ar(totalValorizado)}</Text>
        </View>
      </Page>
    </Document>
  )
}
