-- Migración: Notas de Crédito y Débito (Bloque B).
-- Notas comerciales contra una Venta existente. No fiscales.

CREATE TYPE "TipoNota" AS ENUM ('CREDITO', 'DEBITO');
CREATE TYPE "EstadoNota" AS ENUM ('EMITIDA', 'ANULADA');

CREATE TABLE "NotaCreditoDebito" (
  "id"              TEXT NOT NULL,
  "tipo"            "TipoNota" NOT NULL,
  "letra"           "LetraComprobante" NOT NULL,
  "numero"          TEXT NOT NULL,
  "puntoVenta"      INTEGER NOT NULL,
  "fecha"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ventaOrigenId"   TEXT NOT NULL,
  "clienteId"       TEXT NOT NULL,
  "motivo"          TEXT NOT NULL,
  "montoTotal"      DECIMAL(14, 2) NOT NULL,
  "estado"          "EstadoNota" NOT NULL DEFAULT 'EMITIDA',
  "creadaPorId"     TEXT NOT NULL,
  "anuladaEn"       TIMESTAMP(3),
  "motivoAnulacion" TEXT,
  "clientRequestId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "deletedAt"       TIMESTAMP(3),
  CONSTRAINT "NotaCreditoDebito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaCreditoDebito_numero_key"          ON "NotaCreditoDebito"("numero");
CREATE UNIQUE INDEX "NotaCreditoDebito_clientRequestId_key" ON "NotaCreditoDebito"("clientRequestId");
CREATE INDEX "NotaCreditoDebito_ventaOrigenId_idx"          ON "NotaCreditoDebito"("ventaOrigenId");
CREATE INDEX "NotaCreditoDebito_clienteId_idx"              ON "NotaCreditoDebito"("clienteId");
CREATE INDEX "NotaCreditoDebito_fecha_idx"                  ON "NotaCreditoDebito"("fecha");
CREATE INDEX "NotaCreditoDebito_estado_idx"                 ON "NotaCreditoDebito"("estado");

ALTER TABLE "NotaCreditoDebito"
  ADD CONSTRAINT "NotaCreditoDebito_ventaOrigenId_fkey"
  FOREIGN KEY ("ventaOrigenId") REFERENCES "Venta"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "NotaCreditoDebito"
  ADD CONSTRAINT "NotaCreditoDebito_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "NotaCreditoDebito"
  ADD CONSTRAINT "NotaCreditoDebito_creadaPorId_fkey"
  FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE "LineaNotaCreditoDebito" (
  "id"                    TEXT NOT NULL,
  "notaId"                TEXT NOT NULL,
  "productoId"            TEXT NOT NULL,
  "unidadId"              TEXT NOT NULL,
  "cantidad"              DECIMAL(12, 3) NOT NULL,
  "cantidadBase"          DECIMAL(12, 3) NOT NULL,
  "precioUnitario"        DECIMAL(12, 2) NOT NULL,
  "subtotal"              DECIMAL(14, 2) NOT NULL,
  "generaMovimientoStock" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "LineaNotaCreditoDebito_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LineaNotaCreditoDebito_notaId_idx"     ON "LineaNotaCreditoDebito"("notaId");
CREATE INDEX "LineaNotaCreditoDebito_productoId_idx" ON "LineaNotaCreditoDebito"("productoId");

ALTER TABLE "LineaNotaCreditoDebito"
  ADD CONSTRAINT "LineaNotaCreditoDebito_notaId_fkey"
  FOREIGN KEY ("notaId") REFERENCES "NotaCreditoDebito"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "LineaNotaCreditoDebito"
  ADD CONSTRAINT "LineaNotaCreditoDebito_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "LineaNotaCreditoDebito"
  ADD CONSTRAINT "LineaNotaCreditoDebito_unidadId_fkey"
  FOREIGN KEY ("unidadId") REFERENCES "UnidadMedida"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
