-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "TipoMovimientoStock" ADD VALUE 'EGRESO_MERMA';
ALTER TYPE "TipoMovimientoStock" ADD VALUE 'EGRESO_FALTANTE';
ALTER TYPE "TipoMovimientoStock" ADD VALUE 'INGRESO_SOBRANTE';

-- AlterTable
ALTER TABLE "CajaDiaria" ADD COLUMN "numero" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "maxCredito" DECIMAL(14,2),
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "CajaDiaria_numero_key" ON "CajaDiaria"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_codigo_key" ON "Proveedor"("codigo");
