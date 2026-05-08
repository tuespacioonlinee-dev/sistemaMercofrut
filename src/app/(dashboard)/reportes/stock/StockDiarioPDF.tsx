// Componente react-pdf — no lleva "use client" ni "use server"
// Solo se importa desde contextos de cliente (useExportPDF hook)
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { CajaParaReporte, FilaStockDiario } from "@/server/actions/reportes"

// ─── Anchos de columna (landscape A4 ≈ 800 pt usables) ──────────────────────
const W = {
  id:   32,
  desc: 145,
  pres: 38,
  num:  37, // columnas numéricas (×11 = 407 → total ≈ 622 ✓)
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:     { padding: 16, fontSize: 7, fontFamily: "Helvetica" },
  header:   { marginBottom: 10 },
  title:    { fontSize: 13, fontWeight: "bold" },
  subtitle: { fontSize: 8, color: "#555", marginTop: 3 },
  // tabla
  table:    { width: "100%" },
  row:      { flexDirection: "row" },
  // cabeceras
  thGroup:  {
    padding: "3 4",
    fontWeight: "bold",
    fontSize: 7,
    color: "#fff",
    textAlign: "center",
  },
  th: {
    padding: "3 4",
    fontWeight: "bold",
    fontSize: 6.5,
    backgroundColor: "#e9e9e9",
    borderBottom: "0.5 solid #bbb",
  },
  // celdas
  td: { padding: "2 4", fontSize: 6.5 },
  // pie
  tfoot: {
    padding: "3 4",
    fontWeight: "bold",
    fontSize: 6.5,
    backgroundColor: "#f0f0f0",
    borderTop: "1 solid #999",
  },
  // zebra
  even: { backgroundColor: "#fafafa" },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n === 0) return "—"
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 })
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ─── Totales ─────────────────────────────────────────────────────────────────
function calcTotales(filas: FilaStockDiario[]) {
  const sum = (key: keyof FilaStockDiario) =>
    filas.reduce((acc, f) => acc + (f[key] as number), 0)
  return {
    stockInicial:    sum("stockInicial"),
    egresosVta:      sum("egresosVta"),
    egresosMerma:    sum("egresosMerma"),
    egresosFaltante: sum("egresosFaltante"),
    egresosSobra:    sum("egresosSobra"),
    egresosOtros:    sum("egresosOtros"),
    ingresosCompra:  sum("ingresosCompra"),
    ingresosMerma:   sum("ingresosMerma"),
    ingresosFaltante:sum("ingresosFaltante"),
    ingresosSobrante:sum("ingresosSobrante"),
    ingresosOtro:    sum("ingresosOtro"),
    stockFinal:      sum("stockFinal"),
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props {
  caja:  CajaParaReporte
  filas: FilaStockDiario[]
}

export function StockDiarioPDF({ caja, filas }: Props) {
  const t = calcTotales(filas)
  const ahora = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  } as Intl.DateTimeFormatOptions)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* Encabezado */}
        <View style={s.header}>
          <Text style={s.title}>Reporte Diario de Stock</Text>
          <Text style={s.subtitle}>
            Caja N° {caja.numero}  ·  {caja.estado}  ·  Fecha: {fmtFecha(caja.fechaApertura)}
            {caja.fechaCierre ? `  →  ${fmtFecha(caja.fechaCierre)}` : ""}
            {"   |   "}Generado: {ahora}
          </Text>
        </View>

        <View style={s.table}>

          {/* Fila de grupos EGRESOS / INGRESOS */}
          <View style={s.row}>
            <Text style={[s.th, { width: W.id + W.desc + W.pres + W.num }]} />
            <Text style={[s.thGroup, { width: W.num * 5, backgroundColor: "#c0392b" }]}>
              EGRESOS
            </Text>
            <Text style={[s.thGroup, { width: W.num * 5, backgroundColor: "#2471a3" }]}>
              INGRESOS
            </Text>
            <Text style={[s.th, { width: W.num }]} />
          </View>

          {/* Cabeceras de columna */}
          <View style={s.row}>
            <Text style={[s.th, { width: W.id }]}>ID</Text>
            <Text style={[s.th, { width: W.desc }]}>Descripcion</Text>
            <Text style={[s.th, { width: W.pres }]}>Pres.</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right" }]}>Inicial</Text>
            {/* Egresos */}
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#fadbd8" }]}>Vta</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#fadbd8" }]}>Merma</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#fadbd8" }]}>Faltante</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#fadbd8" }]}>Sobra</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#fadbd8" }]}>Otros</Text>
            {/* Ingresos */}
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#d6eaf8" }]}>Compra</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#d6eaf8" }]}>Merma</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#d6eaf8" }]}>Faltante</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#d6eaf8" }]}>Sobrant</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right", backgroundColor: "#d6eaf8" }]}>Otro</Text>
            <Text style={[s.th, { width: W.num, textAlign: "right" }]}>Final</Text>
          </View>

          {/* Filas de datos */}
          {filas.map((f, i) => (
            <View key={f.productoId} style={[s.row, i % 2 === 0 ? s.even : {}]}>
              <Text style={[s.td, { width: W.id }]}>{f.codigo}</Text>
              <Text style={[s.td, { width: W.desc }]}>{f.descripcion}</Text>
              <Text style={[s.td, { width: W.pres }]}>{f.presentacion}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.stockInicial)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.egresosVta)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.egresosMerma)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.egresosFaltante)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.egresosSobra)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.egresosOtros)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.ingresosCompra)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.ingresosMerma)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.ingresosFaltante)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.ingresosSobrante)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.ingresosOtro)}</Text>
              <Text style={[s.td, { width: W.num, textAlign: "right" }]}>{fmt(f.stockFinal)}</Text>
            </View>
          ))}

          {/* Pie — Total de Movimientos */}
          <View style={s.row}>
            <Text style={[s.tfoot, { width: W.id + W.desc + W.pres }]}>Total de Movimientos</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.stockInicial)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.egresosVta)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.egresosMerma)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.egresosFaltante)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.egresosSobra)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.egresosOtros)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.ingresosCompra)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.ingresosMerma)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.ingresosFaltante)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.ingresosSobrante)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.ingresosOtro)}</Text>
            <Text style={[s.tfoot, { width: W.num, textAlign: "right" }]}>{fmt(t.stockFinal)}</Text>
          </View>

        </View>
      </Page>
    </Document>
  )
}
