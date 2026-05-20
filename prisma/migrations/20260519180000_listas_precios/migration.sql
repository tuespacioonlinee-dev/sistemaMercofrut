-- ============================================================================
-- LISTAS DE PRECIOS
-- ============================================================================

-- CreateTable
CREATE TABLE "ListaPrecio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ListaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioProducto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "listaPrecioId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecioProducto_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "listaPrecioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ListaPrecio_nombre_key" ON "ListaPrecio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioProducto_productoId_listaPrecioId_key" ON "PrecioProducto"("productoId", "listaPrecioId");

-- CreateIndex
CREATE INDEX "PrecioProducto_listaPrecioId_idx" ON "PrecioProducto"("listaPrecioId");

-- CreateIndex
CREATE INDEX "Cliente_listaPrecioId_idx" ON "Cliente"("listaPrecioId");

-- AddForeignKey
ALTER TABLE "PrecioProducto" ADD CONSTRAINT "PrecioProducto_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioProducto" ADD CONSTRAINT "PrecioProducto_listaPrecioId_fkey"
    FOREIGN KEY ("listaPrecioId") REFERENCES "ListaPrecio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_listaPrecioId_fkey"
    FOREIGN KEY ("listaPrecioId") REFERENCES "ListaPrecio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
