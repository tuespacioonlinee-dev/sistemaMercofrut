// Componente react-pdf — sin directiva "use client" ni "use server"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { PersonaResumen, FilaMovimientoCuenta } from "@/server/actions/reportes"

const s = StyleSheet.create({
  page:   { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  hdr:    { marginBottom: 10, borderBottom: "0.5 solid #ccc", paddingBottom: 8 },
  title:  { fontSize: 13, fontWeight: "bold" },
  sub:    { fontSize: 8, color: "#555", marginTop: 3 },
  info:   { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 12 },
  infoItem: { fontSize: 7.5 },
  table:  { width: "100%", marginTop: 8 },
  row:    { flexDirection: "row" },
  th:     { padding: "3 4", fontWeight: "bold", fontSize: 7, backgroundColor: "#e9e9e9", borderBottom: "0.5 solid #bbb" },
  td:     { padding: "2 4", fontSize: 7 },
  tfoot:  { padding: "3 4", fontWeight: "bold", fontSize: 7, backgroundColor: "#f0f0f0", borderTop: "1 solid #999" },
  even:   { backgroundColor: "#fafafa" },
})

// Anchos
const W = { fecha: 58, tipo: 45, num: 55, desc: 180, debe: 58, haber: 58, saldo: 62 }

function fmtM(n: number) {
  return n === 0 ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface Props {
  persona: PersonaResumen
  filas:   FilaMovimientoCuenta[]
  filtro:  string
}

export function CtaCtePDF({ persona, filas, filtro }: Props) {
  const totalDebe  = filas.reduce((a, f) => a + f.debe,  0)
  const totalHaber = filas.reduce((a, f) => a + f.haber, 0)
  const saldoFinal = filas.length > 0 ? filas[filas.length - 1].saldoAcumulado : persona.saldo

  const ahora = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  } as Intl.DateTimeFormatOptions)

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={s.page}>
        {/* Encabezado */}
        <View style={s.hdr}>
          <Text style={s.title}>Consulta de Cuenta Corriente</Text>
          <Text style={s.sub}>Filtro: {filtro}   |   Generado: {ahora}</Text>
          <View style={s.info}>
            <Text style={s.infoItem}><Text style={{ fontWeight: "bold" }}>Nombre: </Text>{persona.nombre}</Text>
            <Text style={s.infoItem}><Text style={{ fontWeight: "bold" }}>CUIT: </Text>{persona.cuit}</Text>
            <Text style={s.infoItem}><Text style={{ fontWeight: "bold" }}>Tipo: </Text>{persona.tipo}</Text>
            {persona.localidad && (
              <Text style={s.infoItem}><Text style={{ fontWeight: "bold" }}>Localidad: </Text>{persona.localidad}</Text>
            )}
          </View>
        </View>

        {/* Tabla */}
        <View style={s.table}>
          <View style={s.row}>
            <Text style={[s.th, { width: W.fecha }]}>Fecha</Text>
            <Text style={[s.th, { width: W.tipo }]}>Tipo</Text>
            <Text style={[s.th, { width: W.num }]}>Número</Text>
            <Text style={[s.th, { width: W.desc }]}>Concepto</Text>
            <Text style={[s.th, { width: W.debe, textAlign: "right" }]}>Debe</Text>
            <Text style={[s.th, { width: W.haber, textAlign: "right" }]}>Haber</Text>
            <Text style={[s.th, { width: W.saldo, textAlign: "right" }]}>Saldo</Text>
          </View>

          {filas.map((f, i) => (
            <View key={f.id} style={[s.row, i % 2 === 0 ? s.even : {}]}>
              <Text style={[s.td, { width: W.fecha }]}>{fmtFecha(f.fecha)}</Text>
              <Text style={[s.td, { width: W.tipo }]}>{f.tipoComprobante}</Text>
              <Text style={[s.td, { width: W.num }]}>{f.numero ?? "—"}</Text>
              <Text style={[s.td, { width: W.desc }]}>{f.descripcion}</Text>
              <Text style={[s.td, { width: W.debe, textAlign: "right" }]}>{fmtM(f.debe)}</Text>
              <Text style={[s.td, { width: W.haber, textAlign: "right" }]}>{fmtM(f.haber)}</Text>
              <Text style={[s.td, { width: W.saldo, textAlign: "right" }]}>{fmtM(f.saldoAcumulado)}</Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.row}>
            <Text style={[s.tfoot, { width: W.fecha + W.tipo + W.num + W.desc }]}>Totales</Text>
            <Text style={[s.tfoot, { width: W.debe,  textAlign: "right" }]}>{fmtM(totalDebe)}</Text>
            <Text style={[s.tfoot, { width: W.haber, textAlign: "right" }]}>{fmtM(totalHaber)}</Text>
            <Text style={[s.tfoot, { width: W.saldo, textAlign: "right" }]}>{fmtM(saldoFinal)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
