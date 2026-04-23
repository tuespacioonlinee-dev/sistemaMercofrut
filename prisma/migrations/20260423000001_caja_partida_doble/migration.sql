-- Migration: caja_partida_doble
-- Reemplaza TipoMovCaja INGRESO/EGRESO por partida doble:
-- CONTADO_DEBE | CONTADO_HABER | CC_DEBE | CC_HABER
-- Preserva datos existentes: INGRESO → CONTADO_HABER, EGRESO → CONTADO_DEBE

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Renombrar enum viejo para poder crear el nuevo con el mismo nombre
-- ────────────────────────────────────────────────────────────────────────────
ALTER TYPE "TipoMovCaja" RENAME TO "TipoMovCaja_old";

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Crear el nuevo enum con las 4 columnas contables
-- ────────────────────────────────────────────────────────────────────────────
CREATE TYPE "TipoMovCaja" AS ENUM ('CONTADO_DEBE', 'CONTADO_HABER', 'CC_DEBE', 'CC_HABER');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Migrar columna con mapeo de datos de prueba existentes
--    INGRESO → CONTADO_HABER (ingresos de caja = contado haber)
--    EGRESO  → CONTADO_DEBE  (egresos de caja = contado debe)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "MovimientoCaja"
  ALTER COLUMN "tipo" TYPE "TipoMovCaja"
  USING CASE
    WHEN tipo::text = 'INGRESO' THEN 'CONTADO_HABER'::"TipoMovCaja"
    WHEN tipo::text = 'EGRESO'  THEN 'CONTADO_DEBE'::"TipoMovCaja"
    ELSE 'CONTADO_HABER'::"TipoMovCaja"
  END;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Eliminar enum viejo
-- ────────────────────────────────────────────────────────────────────────────
DROP TYPE "TipoMovCaja_old";

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Agregar deletedAt a MovimientoCaja (soft delete)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "MovimientoCaja" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Agregar 4 totales de cierre a CajaDiaria
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "CajaDiaria" ADD COLUMN "totalContadoHaber" DECIMAL(14,2);
ALTER TABLE "CajaDiaria" ADD COLUMN "totalContadoDebe"  DECIMAL(14,2);
ALTER TABLE "CajaDiaria" ADD COLUMN "totalCCHaber"      DECIMAL(14,2);
ALTER TABLE "CajaDiaria" ADD COLUMN "totalCCDebe"       DECIMAL(14,2);
