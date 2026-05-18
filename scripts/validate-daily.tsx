// scripts/validate-daily.tsx
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseArgs } from "./validate/args";
import {
  getNegocioInfo,
  getCajaData,
  getVentasData,
  getStockData,
  getSaldosCCData,
} from "./validate/queries";
import { CierreDiarioPDF } from "./validate/pdf";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("\n=== Reporte de Cierre Diario ===\n");
  console.log(`Fecha: ${format(args.fecha, "dd/MM/yyyy", { locale: es })}`);
  console.log(`DB: ${args.target.replace(/:[^:@]+@/, ":***@")}\n`);

  const prisma = new PrismaClient({
    datasources: { db: { url: args.target } },
  });

  try {
    const [negocio, caja, ventas, stock, saldosCC] = await Promise.all([
      getNegocioInfo(prisma),
      getCajaData(prisma, args.fecha),
      getVentasData(prisma, args.fecha),
      getStockData(prisma, args.fecha),
      getSaldosCCData(prisma, args.fecha),
    ]);

    console.log(`Negocio: ${negocio.nombre}`);
    console.log(`Caja: ${caja.encontrada ? `#${caja.numero} (${caja.estado})` : "Sin caja"}`);
    console.log(`Ventas: ${ventas.ventas.length}`);
    console.log(`Productos con movimiento: ${stock.items.length}`);
    console.log(`Cuentas CC con movimiento: ${saldosCC.items.length}`);

    const fechaStr = format(args.fecha, "dd/MM/yyyy", { locale: es });

    const buffer = await renderToBuffer(
      <CierreDiarioPDF
        negocio={negocio.nombre}
        fecha={fechaStr}
        caja={caja}
        ventas={ventas}
        stock={stock}
        saldosCC={saldosCC}
      />
    );

    const filename = `cierre-diario-${format(args.fecha, "yyyy-MM-dd")}.pdf`;
    writeFileSync(filename, new Uint8Array(buffer));

    console.log(`\nPDF generado: ${filename}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
