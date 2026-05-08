// Componente react-pdf genérico — sin directiva "use client" ni "use server"
// Compatible con @react-pdf/renderer v4+
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/** Definición de una columna para ReportePDF */
export interface ColPDF {
  /** Clave del dato en la fila (debe coincidir con los keys de FilaPDF) */
  key:     string
  /** Texto que aparece en la cabecera */
  header:  string
  /** Ancho en puntos PDF */
  width:   number
  /** Alineación del contenido (default "left") */
  align?:  "left" | "right" | "center"
}

/** Una fila de datos: valores indexados por `ColPDF.key` */
export type FilaPDF = Record<string, string | number | null | undefined>

export interface ReportePDFProps {
  titulo:        string
  subtitulo?:    string
  columnas:      ColPDF[]
  filas:         FilaPDF[]
  /** Fila de totales al pie (opcional) — se muestra si se pasa */
  pieTotales?:   FilaPDF
  /** Etiqueta de la fila de totales (default "Totales") */
  etiquetaPie?:  string
  orientacion?:  "portrait" | "landscape"
}

// ─── Estilos base ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:   { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  hdr:    { marginBottom: 10 },
  title:  { fontSize: 13, fontWeight: "bold" },
  sub:    { fontSize: 8.5, color: "#555", marginTop: 3 },
  gen:    { fontSize: 7.5, color: "#888", marginTop: 2 },
  table:  { marginTop: 6 },
  row:    { flexDirection: "row" },
  th:     {
    padding: "3 4",
    fontWeight: "bold",
    fontSize: 7,
    backgroundColor: "#e9e9e9",
    borderBottom: "0.5 solid #bbb",
  },
  td:     { padding: "2 4", fontSize: 7 },
  tfoot:  {
    padding: "3 4",
    fontWeight: "bold",
    fontSize: 7,
    backgroundColor: "#f0f0f0",
    borderTop: "1 solid #999",
  },
  even:   { backgroundColor: "#fafafa" },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cellValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—"
  return String(val)
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Wrapper genérico de react-pdf.
 *
 * Genera un PDF estándar con encabezado, tabla configurable y fila de totales opcional.
 * Ideal para reportes simples. Para layouts complejos (columnas agrupadas, etc.)
 * crear un componente PDF específico e invocar `useExportPDF` directamente.
 *
 * Ejemplo de uso con useExportPDF:
 * ```tsx
 * import { createElement } from "react"
 * import { ReportePDF, type ColPDF } from "@/components/shared/ReportePDF"
 * import { useExportPDF } from "@/components/shared/useExportPDF"
 *
 * const { exportar, isGenerating } = useExportPDF()
 *
 * const columnas: ColPDF[] = [
 *   { key: "nombre", header: "Nombre",  width: 200 },
 *   { key: "saldo",  header: "Saldo",   width: 80, align: "right" },
 * ]
 *
 * await exportar(
 *   createElement(ReportePDF, { titulo: "Mi reporte", columnas, filas: datos }),
 *   "mi-reporte.pdf",
 * )
 * ```
 */
export function ReportePDF({
  titulo,
  subtitulo,
  columnas,
  filas,
  pieTotales,
  etiquetaPie = "Totales",
  orientacion = "portrait",
}: ReportePDFProps) {
  const ahora = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  } as Intl.DateTimeFormatOptions)

  return (
    <Document>
      <Page size="A4" orientation={orientacion} style={s.page}>

        {/* Encabezado */}
        <View style={s.hdr}>
          <Text style={s.title}>{titulo}</Text>
          {subtitulo && <Text style={s.sub}>{subtitulo}</Text>}
          <Text style={s.gen}>Generado: {ahora}  ·  {filas.length} registro{filas.length !== 1 ? "s" : ""}</Text>
        </View>

        {/* Tabla */}
        <View style={s.table}>

          {/* Cabecera */}
          <View style={s.row}>
            {columnas.map((col) => (
              <Text
                key={col.key}
                style={[s.th, { width: col.width, textAlign: col.align ?? "left" }]}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {/* Filas de datos */}
          {filas.map((fila, i) => (
            <View key={i} style={[s.row, i % 2 === 0 ? s.even : {}]}>
              {columnas.map((col) => (
                <Text
                  key={col.key}
                  style={[s.td, { width: col.width, textAlign: col.align ?? "left" }]}
                >
                  {cellValue(fila[col.key])}
                </Text>
              ))}
            </View>
          ))}

          {/* Fila de totales (opcional) */}
          {pieTotales && (
            <View style={s.row}>
              {columnas.map((col, idx) => (
                <Text
                  key={col.key}
                  style={[s.tfoot, { width: col.width, textAlign: col.align ?? "left" }]}
                >
                  {idx === 0 ? etiquetaPie : cellValue(pieTotales[col.key])}
                </Text>
              ))}
            </View>
          )}

        </View>
      </Page>
    </Document>
  )
}
