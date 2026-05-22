/**
 * Dataset de 30 productos profesionales del rubro frutihortícola argentino.
 *
 * Precios en pesos argentinos del día (mayoristas):
 *  - Cajón de fruta: $8.000-$25.000
 *  - Cajón/bolsa de verdura/hortaliza: $5.000-$15.000
 *  - Algunos por kg/atado: precio menor por unidad
 *
 * Todos los productos perecederos tienen `controlaVencimiento=true` y
 * se les crearán 3-5 lotes con vencimientos escalonados en el seed.
 */

export type CategoriaNombre = "Frutas" | "Cítricos" | "Verduras" | "Hortalizas"
export type UnidadAbrev = "Kg" | "Cjn" | "Bls" | "Atd" | "Un"

export interface ProductoSeed {
  codigo: string
  nombre: string
  categoria: CategoriaNombre
  unidadAbrev: UnidadAbrev
  precioVenta: number
  precioCompra: number
  controlaVencimiento: boolean
  stockMinimo: number
  /** Cuántos lotes crear en el seed para este producto (perecederos) */
  cantidadLotes: number
}

export const PRODUCTOS: ProductoSeed[] = [
  // ───── FRUTAS (15) ─────
  { codigo: "F001", nombre: "Manzana Red Delicious (cajón 18 kg)", categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 14_500, precioCompra: 11_200, controlaVencimiento: true, stockMinimo: 5, cantidadLotes: 4 },
  { codigo: "F002", nombre: "Manzana Granny Smith (cajón 18 kg)",  categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 15_800, precioCompra: 12_300, controlaVencimiento: true, stockMinimo: 5, cantidadLotes: 3 },
  { codigo: "F003", nombre: "Banana Ecuador (cajón 22 kg)",        categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 18_900, precioCompra: 14_500, controlaVencimiento: true, stockMinimo: 8, cantidadLotes: 5 },
  { codigo: "F004", nombre: "Pera Williams (cajón 18 kg)",         categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 13_700, precioCompra: 10_400, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 3 },
  { codigo: "F005", nombre: "Pera Packham's (cajón 18 kg)",        categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 14_200, precioCompra: 10_900, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 3 },
  { codigo: "F006", nombre: "Durazno Elegant Lady (cajón 10 kg)",  categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 12_500, precioCompra:  9_500, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 4 },
  { codigo: "F007", nombre: "Pelón Fantasía (cajón 10 kg)",        categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 11_800, precioCompra:  8_900, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },
  { codigo: "F008", nombre: "Ciruela Larry Ann (cajón 10 kg)",     categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 13_400, precioCompra: 10_100, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },
  { codigo: "F009", nombre: "Uva Red Globe (cajón 8 kg)",          categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 22_500, precioCompra: 17_800, controlaVencimiento: true, stockMinimo: 2, cantidadLotes: 3 },
  { codigo: "F010", nombre: "Frutilla Camarosa (cajón 5 kg)",      categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 24_800, precioCompra: 19_500, controlaVencimiento: true, stockMinimo: 2, cantidadLotes: 4 },
  { codigo: "F011", nombre: "Palta Hass (cajón 10 kg)",            categoria: "Frutas", unidadAbrev: "Cjn", precioVenta: 21_500, precioCompra: 16_800, controlaVencimiento: true, stockMinimo: 2, cantidadLotes: 3 },
  { codigo: "C001", nombre: "Naranja Valencia (bolsa 20 kg)",      categoria: "Cítricos", unidadAbrev: "Bls", precioVenta:  9_800, precioCompra:  7_200, controlaVencimiento: true, stockMinimo: 6, cantidadLotes: 4 },
  { codigo: "C002", nombre: "Mandarina Murcott (cajón 18 kg)",     categoria: "Cítricos", unidadAbrev: "Cjn", precioVenta: 11_200, precioCompra:  8_400, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 3 },
  { codigo: "C003", nombre: "Limón Eureka (bolsa 15 kg)",          categoria: "Cítricos", unidadAbrev: "Bls", precioVenta:  8_400, precioCompra:  6_200, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 3 },
  { codigo: "C004", nombre: "Pomelo Rosado (cajón 15 kg)",         categoria: "Cítricos", unidadAbrev: "Cjn", precioVenta: 10_500, precioCompra:  7_900, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },

  // ───── VERDURAS (15) ─────
  { codigo: "V001", nombre: "Tomate Redondo (cajón 18 kg)",        categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta: 14_500, precioCompra: 11_000, controlaVencimiento: true, stockMinimo: 6, cantidadLotes: 5 },
  { codigo: "V002", nombre: "Tomate Perita (cajón 18 kg)",         categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta: 13_200, precioCompra: 10_000, controlaVencimiento: true, stockMinimo: 5, cantidadLotes: 4 },
  { codigo: "V003", nombre: "Pimiento Rojo Morrón (cajón 8 kg)",   categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta: 11_800, precioCompra:  8_900, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },
  { codigo: "V004", nombre: "Pimiento Verde (cajón 8 kg)",         categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta:  9_400, precioCompra:  7_100, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },
  { codigo: "V005", nombre: "Berenjena (cajón 10 kg)",             categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta:  8_600, precioCompra:  6_500, controlaVencimiento: true, stockMinimo: 3, cantidadLotes: 3 },
  { codigo: "V006", nombre: "Lechuga Mantecosa (cajón 24 un)",     categoria: "Verduras",   unidadAbrev: "Cjn", precioVenta:  7_200, precioCompra:  5_400, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 5 },
  { codigo: "V007", nombre: "Acelga (atado 1 kg)",                 categoria: "Verduras",   unidadAbrev: "Atd", precioVenta:  1_200, precioCompra:    850, controlaVencimiento: true, stockMinimo: 10, cantidadLotes: 4 },
  { codigo: "V008", nombre: "Brócoli (kg)",                        categoria: "Verduras",   unidadAbrev: "Kg",  precioVenta:  3_400, precioCompra:  2_500, controlaVencimiento: true, stockMinimo: 10, cantidadLotes: 3 },
  { codigo: "V009", nombre: "Coliflor (unidad)",                   categoria: "Verduras",   unidadAbrev: "Un",  precioVenta:  1_800, precioCompra:  1_300, controlaVencimiento: true, stockMinimo: 8, cantidadLotes: 3 },
  { codigo: "H001", nombre: "Papa Spunta (bolsa 25 kg)",           categoria: "Hortalizas", unidadAbrev: "Bls", precioVenta:  9_500, precioCompra:  7_100, controlaVencimiento: true, stockMinimo: 8, cantidadLotes: 4 },
  { codigo: "H002", nombre: "Papa Negra Andina (bolsa 25 kg)",     categoria: "Hortalizas", unidadAbrev: "Bls", precioVenta: 12_400, precioCompra:  9_300, controlaVencimiento: true, stockMinimo: 4, cantidadLotes: 3 },
  { codigo: "H003", nombre: "Cebolla Valenciana (bolsa 25 kg)",    categoria: "Hortalizas", unidadAbrev: "Bls", precioVenta:  8_900, precioCompra:  6_700, controlaVencimiento: true, stockMinimo: 6, cantidadLotes: 3 },
  { codigo: "H004", nombre: "Zanahoria (bolsa 20 kg)",             categoria: "Hortalizas", unidadAbrev: "Bls", precioVenta:  7_200, precioCompra:  5_400, controlaVencimiento: true, stockMinimo: 5, cantidadLotes: 3 },
  { codigo: "H005", nombre: "Zapallo Anco (kg)",                   categoria: "Hortalizas", unidadAbrev: "Kg",  precioVenta:    980, precioCompra:    720, controlaVencimiento: true, stockMinimo: 30, cantidadLotes: 3 },
  { codigo: "H006", nombre: "Ajo Blanco (atado 1 kg)",             categoria: "Hortalizas", unidadAbrev: "Atd", precioVenta:  4_800, precioCompra:  3_600, controlaVencimiento: true, stockMinimo: 8, cantidadLotes: 3 },
]

/** Lista única de categorías que necesitamos (upsert al seedear catálogo). */
export const CATEGORIAS_REQUERIDAS: CategoriaNombre[] = ["Frutas", "Cítricos", "Verduras", "Hortalizas"]

/** Lista única de unidades de medida (upsert al seedear catálogo). */
export const UNIDADES_REQUERIDAS: Array<{ nombre: string; abreviatura: UnidadAbrev }> = [
  { nombre: "Kilogramo", abreviatura: "Kg" },
  { nombre: "Cajón",     abreviatura: "Cjn" },
  { nombre: "Bolsa",     abreviatura: "Bls" },
  { nombre: "Atado",     abreviatura: "Atd" },
  { nombre: "Unidad",    abreviatura: "Un" },
]
