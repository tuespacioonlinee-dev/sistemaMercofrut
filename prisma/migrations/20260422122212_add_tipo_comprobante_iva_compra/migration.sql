-- CreateEnum
CREATE TYPE "TipoComprobanteCompra" AS ENUM ('FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'FACTURA_E', 'REMITO', 'TICKET', 'OTRO');

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "iva" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "puntoVenta" INTEGER,
ADD COLUMN     "tipoComprobante" "TipoComprobanteCompra";
