// scripts/manual/pdf.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Capitulo } from "./content";

const s = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitulo: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  coverSubtitulo: {
    fontSize: 18,
    color: "#475569",
    marginBottom: 8,
  },
  coverFecha: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 40,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
  h1: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  parrafo: {
    marginBottom: 8,
  },
  pasoContainer: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 8,
  },
  pasoNumero: {
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    width: 24,
    flexShrink: 0,
  },
  pasoTexto: {
    flex: 1,
  },
  indiceTitulo: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  indiceItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  indiceNumero: {
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    width: 30,
  },
  indiceTituloText: {
    flex: 1,
    fontSize: 12,
  },
});

interface Props {
  capitulos: Capitulo[];
  fecha: string;
}

export function ManualPDF({ capitulos, fecha }: Props) {
  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverTitulo}>Mercofrut</Text>
        <Text style={s.coverSubtitulo}>Manual de Usuario</Text>
        <Text style={s.coverFecha}>Generado el {fecha}</Text>
      </Page>

      {/* Table of contents */}
      <Page size="A4" style={s.page}>
        <Text style={s.indiceTitulo}>Contenido</Text>
        {capitulos.map((cap) => (
          <View key={cap.numero} style={s.indiceItem}>
            <Text style={s.indiceNumero}>{cap.numero}.</Text>
            <Text style={s.indiceTituloText}>{cap.titulo}</Text>
          </View>
        ))}
        <Text
          style={s.footer}
          render={({ pageNumber }) => `${pageNumber}`}
          fixed
        />
      </Page>

      {/* Chapters */}
      {capitulos.map((cap) => (
        <Page key={cap.numero} size="A4" style={s.page} wrap>
          <Text style={s.header} fixed>
            Manual de Usuario — Mercofrut
          </Text>
          <Text
            style={s.footer}
            render={({ pageNumber }) => `${pageNumber}`}
            fixed
          />

          <Text style={s.h1}>
            {cap.numero}. {cap.titulo}
          </Text>

          {cap.secciones.map((sec, si) => (
            <View key={si} wrap={false}>
              <Text style={s.h2}>{sec.titulo}</Text>
              {sec.parrafos.map((p, pi) => (
                <Text key={pi} style={s.parrafo}>
                  {p}
                </Text>
              ))}
              {sec.pasos?.map((paso, pi) => (
                <View key={pi} style={s.pasoContainer}>
                  <Text style={s.pasoNumero}>{pi + 1}.</Text>
                  <Text style={s.pasoTexto}>{paso.texto}</Text>
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
