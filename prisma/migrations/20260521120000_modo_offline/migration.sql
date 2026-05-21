-- Migración: Modo offline limitado (Bloque Offline).
-- Aditivo — no modifica tablas existentes.

CREATE TYPE "EstadoDispositivo" AS ENUM ('ONLINE', 'OFFLINE');

CREATE TABLE "DispositivoActivo" (
  "id"                       TEXT NOT NULL,
  "usuarioId"                TEXT NOT NULL,
  "fingerprint"              TEXT NOT NULL,
  "nombre"                   TEXT,
  "estado"                   "EstadoDispositivo" NOT NULL DEFAULT 'ONLINE',
  "ultimoHeartbeat"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ventasOfflinePendientes"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DispositivoActivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DispositivoActivo_fingerprint_key" ON "DispositivoActivo"("fingerprint");
CREATE INDEX "DispositivoActivo_usuarioId_idx" ON "DispositivoActivo"("usuarioId");
CREATE INDEX "DispositivoActivo_estado_ultimoHeartbeat_idx" ON "DispositivoActivo"("estado", "ultimoHeartbeat");

ALTER TABLE "DispositivoActivo"
  ADD CONSTRAINT "DispositivoActivo_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE "NumeroComprobanteReservado" (
  "id"               TEXT NOT NULL,
  "tipo"             "TipoComprobante" NOT NULL,
  "letra"            "LetraComprobante" NOT NULL,
  "puntoVenta"       INTEGER NOT NULL,
  "numero"           INTEGER NOT NULL,
  "numeroFormateado" TEXT NOT NULL,
  "token"            TEXT NOT NULL,
  "dispositivoId"    TEXT NOT NULL,
  "usuarioId"        TEXT NOT NULL,
  "reservadoEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEn"         TIMESTAMP(3) NOT NULL,
  "consumido"        BOOLEAN NOT NULL DEFAULT false,
  "ventaIdConsumida" TEXT,
  CONSTRAINT "NumeroComprobanteReservado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NumeroComprobanteReservado_ventaIdConsumida_key" ON "NumeroComprobanteReservado"("ventaIdConsumida");
CREATE UNIQUE INDEX "NumeroComprobanteReservado_tipo_letra_puntoVenta_numero_key"
  ON "NumeroComprobanteReservado"("tipo", "letra", "puntoVenta", "numero");
CREATE INDEX "NumeroComprobanteReservado_token_idx"          ON "NumeroComprobanteReservado"("token");
CREATE INDEX "NumeroComprobanteReservado_dispositivoId_idx"  ON "NumeroComprobanteReservado"("dispositivoId");
CREATE INDEX "NumeroComprobanteReservado_expiraEn_consumido_idx"
  ON "NumeroComprobanteReservado"("expiraEn", "consumido");

ALTER TABLE "NumeroComprobanteReservado"
  ADD CONSTRAINT "NumeroComprobanteReservado_dispositivoId_fkey"
  FOREIGN KEY ("dispositivoId") REFERENCES "DispositivoActivo"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "NumeroComprobanteReservado"
  ADD CONSTRAINT "NumeroComprobanteReservado_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
