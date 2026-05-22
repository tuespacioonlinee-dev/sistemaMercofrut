/**
 * Dataset de 15 clientes profesionales (minoristas y HORECA) del Gran Tucumán.
 *
 * Mezcla:
 *  - ~6 Responsables Inscriptos (verdulerías grandes, restaurantes, supermercados)
 *  - ~3 Monotributistas (verdulerías chicas)
 *  - ~6 Consumidores Finales (puestos chicos, retail final)
 *
 * Algunos tienen `maxCredito` para habilitar venta en cuenta corriente.
 * Saldos iniciales en 0 — los saldos finales emergen del seed de operación.
 */
import { generarCUIT, generarDNI } from "../helpers-cuit"
import type { CondicionIva, TipoDocumento } from "@prisma/client"

const RI = "RESPONSABLE_INSCRIPTO" as const satisfies CondicionIva
const MT = "MONOTRIBUTO"            as const satisfies CondicionIva
const CF = "CONSUMIDOR_FINAL"       as const satisfies CondicionIva

const CUIT_TIPO = "CUIT" as const satisfies TipoDocumento
const DNI_TIPO  = "DNI"  as const satisfies TipoDocumento

export interface ClienteSeed {
  codigo: string
  nombreRazonSocial: string
  tipoDocumento: TipoDocumento
  documento: string
  condicionIva: CondicionIva
  direccion: string
  localidad: string
  provincia: string
  telefono: string
  email: string | null
  /** Si tiene crédito CC habilitado, monto máximo. */
  maxCredito: number | null
}

export const CLIENTES: ClienteSeed[] = [
  {
    codigo: "10001",
    nombreRazonSocial: "Verdulería El Vergel",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("30", 71_000_001),
    condicionIva: RI,
    direccion: "Av. Mate de Luna 2450",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4243210",
    email: "elvergel.compras@gmail.com",
    maxCredito: 200_000,
  },
  {
    codigo: "10002",
    nombreRazonSocial: "Supermercado Don Pedro SRL",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("30", 71_000_020),
    condicionIva: RI,
    direccion: "Av. Aconquija 1180",
    localidad: "Yerba Buena",
    provincia: "Tucumán",
    telefono: "+54 381 4255891",
    email: "compras@superdonpedro.com.ar",
    maxCredito: 500_000,
  },
  {
    codigo: "10003",
    nombreRazonSocial: "Frutería La Plaza",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("27", 21_300_030),
    condicionIva: MT,
    direccion: "Calle 24 de Septiembre 615",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4316782",
    email: "fruterialaplaza@gmail.com",
    maxCredito: 80_000,
  },
  {
    codigo: "10004",
    nombreRazonSocial: "Verdulería Los Pinos",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(28_540_040),
    condicionIva: CF,
    direccion: "Calle San Martín 980",
    localidad: "Tafí Viejo",
    provincia: "Tucumán",
    telefono: "+54 381 4612345",
    email: null,
    maxCredito: 50_000,
  },
  {
    codigo: "10005",
    nombreRazonSocial: "Restaurant La Tradición SRL",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("30", 71_000_050),
    condicionIva: RI,
    direccion: "Calle San Lorenzo 845",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4225698",
    email: "compras@latradicionrestaurant.com.ar",
    maxCredito: 150_000,
  },
  {
    codigo: "10006",
    nombreRazonSocial: "Almacén San Cayetano",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(31_270_060),
    condicionIva: CF,
    direccion: "Av. Independencia 235",
    localidad: "Banda del Río Salí",
    provincia: "Tucumán",
    telefono: "+54 381 4651234",
    email: null,
    maxCredito: null,
  },
  {
    codigo: "10007",
    nombreRazonSocial: "Verdulería La Esquina",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(32_180_070),
    condicionIva: CF,
    direccion: "Av. Perón esq. Solano Vera",
    localidad: "Yerba Buena",
    provincia: "Tucumán",
    telefono: "+54 381 4252468",
    email: null,
    maxCredito: 40_000,
  },
  {
    codigo: "10008",
    nombreRazonSocial: "Frutería 25 de Mayo",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("27", 22_450_080),
    condicionIva: MT,
    direccion: "Calle 25 de Mayo 467",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4308912",
    email: "fruteria25demayo@hotmail.com",
    maxCredito: 60_000,
  },
  {
    codigo: "10009",
    nombreRazonSocial: "Supermercado Norte SA",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("30", 71_000_090),
    condicionIva: RI,
    direccion: "Av. Aconquija 3580",
    localidad: "Yerba Buena",
    provincia: "Tucumán",
    telefono: "+54 381 4256712",
    email: "abastecimiento@supernortesa.com.ar",
    maxCredito: 400_000,
  },
  {
    codigo: "10010",
    nombreRazonSocial: "Verdulería La Florida",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(29_870_100),
    condicionIva: CF,
    direccion: "Av. Roca 1820",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4347823",
    email: null,
    maxCredito: 35_000,
  },
  {
    codigo: "10011",
    nombreRazonSocial: "Restaurant Los Quinchos",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("27", 23_510_110),
    condicionIva: MT,
    direccion: "Av. Crítto s/n",
    localidad: "Tafí del Valle",
    provincia: "Tucumán",
    telefono: "+54 3867 421023",
    email: "losquinchos.tafi@gmail.com",
    maxCredito: 100_000,
  },
  {
    codigo: "10012",
    nombreRazonSocial: "Hotel Catalinas Park SA",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("30", 71_000_120),
    condicionIva: RI,
    direccion: "Av. Soldati 380",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4504711",
    email: "compras@hotelcatalinaspark.com.ar",
    maxCredito: 250_000,
  },
  {
    codigo: "10013",
    nombreRazonSocial: "Cocina Las Brasas",
    tipoDocumento: CUIT_TIPO,
    documento: generarCUIT("20", 24_650_130),
    condicionIva: MT,
    direccion: "Calle Las Heras 1245",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4221987",
    email: "lasbrasas.smt@gmail.com",
    maxCredito: 90_000,
  },
  {
    codigo: "10014",
    nombreRazonSocial: "Mercado Central San Miguel",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(33_120_140),
    condicionIva: CF,
    direccion: "Av. Sarmiento esq. Lavalle",
    localidad: "San Miguel de Tucumán",
    provincia: "Tucumán",
    telefono: "+54 381 4302468",
    email: null,
    maxCredito: null,
  },
  {
    codigo: "10015",
    nombreRazonSocial: "Frutería El Manantial",
    tipoDocumento: DNI_TIPO,
    documento: generarDNI(30_890_150),
    condicionIva: CF,
    direccion: "Av. Perón 4250",
    localidad: "Yerba Buena",
    provincia: "Tucumán",
    telefono: "+54 381 4259876",
    email: null,
    maxCredito: 45_000,
  },
]
