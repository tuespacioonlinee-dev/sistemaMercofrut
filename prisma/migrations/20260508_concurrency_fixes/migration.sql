-- Concurrency / data-integrity fixes
-- 1) Idempotency-keys en Venta, Compra y MovimientoCuenta
-- 2) origenCompraId en LoteProducto (para anular sólo los lotes de esa compra)
-- 3) Unique parciales para evitar TOCTOU:
--    - Una sola caja ABIERTA a la vez
--    - Una sola factura EMITIDA por venta

-- ─── Venta.clientRequestId ─────────────────────────────────────────────
ALTER TABLE "Venta" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "Venta_clientRequestId_key" ON "Venta"("clientRequestId");

-- ─── Compra.clientRequestId ────────────────────────────────────────────
ALTER TABLE "Compra" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "Compra_clientRequestId_key" ON "Compra"("clientRequestId");

-- ─── MovimientoCuenta.clientRequestId ──────────────────────────────────
ALTER TABLE "MovimientoCuenta" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "MovimientoCuenta_clientRequestId_key" ON "MovimientoCuenta"("clientRequestId");

-- ─── LoteProducto.origenCompraId ───────────────────────────────────────
ALTER TABLE "LoteProducto" ADD COLUMN "origenCompraId" TEXT;
CREATE INDEX "LoteProducto_origenCompraId_idx" ON "LoteProducto"("origenCompraId");

-- ─── Unique parcial: una sola CajaDiaria ABIERTA ───────────────────────
-- Postgres soporta unique partial indexes con WHERE
CREATE UNIQUE INDEX "uniq_caja_abierta" ON "CajaDiaria"("estado") WHERE "estado" = 'ABIERTA';

-- ─── Unique parcial: una sola Factura EMITIDA por venta ─────────────────
CREATE UNIQUE INDEX "uniq_factura_emitida_por_venta" ON "Factura"("ventaId") WHERE "estado" = 'EMITIDA';
