// Componente react-pdf — sin directiva "use client" ni "use server"
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { FilaListadoPersona } from "@/server/actions/reportes"

const W = { idx: 22, cod: 38, nombre: 180, cuit: 70, dir: 130, loc: 85, tel: 65, saldo: 65 }

const s = StyleSheet.create({
  page:  { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  hdr:   { marginBottom: 10 },
  title: { fontSize: 13, fontWeight: "bold" },
  sub:   { fontSize: 8.5, color: "#555", marginTop: 3 },
  table: { width: "100%" },
  row:   { flexDirection: "row" },
  th:    { padding: "3 4", fontWeight: "bold", fontSize: 7, backgroundColor: "#e9e9e9", borderBottom: "0.5 solid #bbb" },
  td:    { padding: "2 4", fontSize: 7 },
  tfoot: { padding: "3 4", fontWeight: "bold", fontSize: 7, backgroundColor: "#f0f0f0", borderTop: "1 solid #999" },
  even:  { backgroundColor: "#fafafa" },
})

function fmtSaldo(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 2,
  }).format(n)
}

interface Props {
  titulo:   string
  subtitulo?:string
  filas:    FilaListadoPersona[]
  mostrarSaldoTotal: boolean
}

export function ListadoPersonasPDF({ titulo, subtitulo, filas, mostrarSaldoTotal }: Props) {
  const totalSaldo = filas.reduce((a, f) => a + f.saldo, 0)
  const ahora = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  } as Intl.DateTimeFormatOptions)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.hdr}>
          <Text style={s.title}>{titulo}</Text>
          <Text style={s.sub}>
            {subtitulo ? `${subtitulo}   |   ` : ""}
            {filas.length} registro{filas.length !== 1 ? "s" : ""}
            {"   |   "}Generado: {ahora}
          </Text>
        </View>

        <View style={s.table}>
          {/* Cabecera */}
          <View style={s.row}>
            <Text style={[s.th, { width: W.idx }]}>#</Text>
            <Text style={[s.th, { width: W.cod }]}>Codigo</Text>
            <Text style={[s.th, { width: W.nombre }]}>Nombre</Text>
            <Text style={[s.th, { width: W.cuit }]}>CUIT</Text>
            <Text style={[s.th, { width: W.dir }]}>Dirección</Text>
            <Text style={[s.th, { width: W.loc }]}>Localidad</Text>
            <Text style={[s.th, { width: W.tel }]}>Teléfono</Text>
            <Text style={[s.th, { width: W.saldo, textAlign: "right" }]}>Saldo</Text>
          </View>

          {/* Filas */}
          {filas.map((f, i) => (
            <View key={f.id} style={[s.row, i % 2 === 0 ? s.even : {}]}>
              <Text style={[s.td, { width: W.idx }]}>{i + 1}</Text>
              <Text style={[s.td, { width: W.cod }]}>{f.codigo ?? "—"}</Text>
              <Text style={[s.td, { width: W.nombre }]}>{f.nombre}</Text>
              <Text style={[s.td, { width: W.cuit }]}>{f.cuit}</Text>
              <Text style={[s.td, { width: W.dir }]}>{f.direccion ?? "—"}</Text>
              <Text style={[s.td, { width: W.loc }]}>{f.localidad ?? "—"}</Text>
              <Text style={[s.td, { width: W.tel }]}>{f.telefono ?? "—"}</Text>
              <Text style={[s.td, { width: W.saldo, textAlign: "right" }]}>
                {f.saldo !== 0 ? fmtSaldo(f.saldo) : "—"}
              </Text>
            </View>
          ))}

          {/* Pie (solo en reportes con saldo) */}
          {mostrarSaldoTotal && (
            <View style={s.row}>
              <Text style={[s.tfoot, { width: W.idx + W.cod + W.nombre + W.cuit + W.dir + W.loc + W.tel }]}>
                Saldo Total
              </Text>
              <Text style={[s.tfoot, { width: W.saldo, textAlign: "right" }]}>
                {fmtSaldo(totalSaldo)}
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
