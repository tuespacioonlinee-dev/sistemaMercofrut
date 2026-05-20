-- Migración: SecuenciaComprobante (numeración robusta de comprobantes).
--
-- Reemplaza los contadores hardcodeados de ParametrosComprobante por una
-- tabla genérica indexada por (tipo, letra, puntoVenta).
-- ParametrosComprobante NO se modifica: los campos proximoRemito/A/B/C
-- quedan deprecados pero presentes para no romper código de terceros.

-- 1. Enums
CREATE TYPE "TipoComprobante" AS ENUM (
  'REMITO', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'RECIBO'
);
CREATE TYPE "LetraComprobante" AS ENUM ('A', 'B', 'C', 'X');

-- 2. Tabla
CREATE TABLE "SecuenciaComprobante" (
  "id"           TEXT NOT NULL,
  "tipo"         "TipoComprobante" NOT NULL,
  "letra"        "LetraComprobante" NOT NULL,
  "puntoVenta"   INTEGER NOT NULL,
  "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecuenciaComprobante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SecuenciaComprobante_tipo_letra_puntoVenta_key"
  ON "SecuenciaComprobante"("tipo", "letra", "puntoVenta");

CREATE INDEX "SecuenciaComprobante_puntoVenta_idx"
  ON "SecuenciaComprobante"("puntoVenta");

-- 3. Seed inicial: migrar valores de ParametrosComprobante.
--    El INSERT solo se ejecuta si ya existe al menos una fila en
--    ParametrosComprobante. En entornos fresh la tabla queda vacía y las
--    secuencias se crean lazy en el primer uso del helper.
INSERT INTO "SecuenciaComprobante" ("id", "tipo", "letra", "puntoVenta", "ultimoNumero", "updatedAt")
SELECT 'seq_remito_x_'    || "puntoVenta", 'REMITO'::"TipoComprobante",       'X'::"LetraComprobante", "puntoVenta", GREATEST("proximoRemito"   - 1, 0), NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_factura_a_'   || "puntoVenta", 'FACTURA'::"TipoComprobante",      'A'::"LetraComprobante", "puntoVenta", GREATEST("proximaFacturaA" - 1, 0), NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_factura_b_'   || "puntoVenta", 'FACTURA'::"TipoComprobante",      'B'::"LetraComprobante", "puntoVenta", GREATEST("proximaFacturaB" - 1, 0), NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_factura_c_'   || "puntoVenta", 'FACTURA'::"TipoComprobante",      'C'::"LetraComprobante", "puntoVenta", GREATEST("proximaFacturaC" - 1, 0), NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ncred_a_'     || "puntoVenta", 'NOTA_CREDITO'::"TipoComprobante", 'A'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ncred_b_'     || "puntoVenta", 'NOTA_CREDITO'::"TipoComprobante", 'B'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ncred_c_'     || "puntoVenta", 'NOTA_CREDITO'::"TipoComprobante", 'C'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ndeb_a_'      || "puntoVenta", 'NOTA_DEBITO'::"TipoComprobante",  'A'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ndeb_b_'      || "puntoVenta", 'NOTA_DEBITO'::"TipoComprobante",  'B'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_ndeb_c_'      || "puntoVenta", 'NOTA_DEBITO'::"TipoComprobante",  'C'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante"
UNION ALL SELECT 'seq_recibo_x_'    || "puntoVenta", 'RECIBO'::"TipoComprobante",       'X'::"LetraComprobante", "puntoVenta", 0, NOW() FROM "ParametrosComprobante";
