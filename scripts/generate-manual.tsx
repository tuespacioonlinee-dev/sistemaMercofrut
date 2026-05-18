// scripts/generate-manual.tsx
import { writeFileSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { capitulos } from "./manual/content";
import { ManualPDF } from "./manual/pdf";

async function main() {
  console.log("\n=== Generando Manual de Usuario ===\n");
  console.log(`Capítulos: ${capitulos.length}`);

  const fecha = format(new Date(), "dd/MM/yyyy", { locale: es });

  const buffer = await renderToBuffer(
    <ManualPDF capitulos={capitulos} fecha={fecha} />
  );

  const filename = "manual-usuario-mercofrut.pdf";
  writeFileSync(filename, new Uint8Array(buffer));

  console.log(`\nPDF generado: ${filename}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
