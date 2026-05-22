/**
 * Dataset de 15 proveedores profesionales del rubro frutihortícola argentino.
 *
 * Todos los CUITs son válidos (DV verificado con módulo-11).
 * Condición IVA: mayoría Responsable Inscripto; productores directos como
 * Monotributistas.
 */
import { generarCUIT } from "../helpers-cuit"
import type { CondicionIva } from "@prisma/client"

const RI = "RESPONSABLE_INSCRIPTO" as const satisfies CondicionIva
const MT = "MONOTRIBUTO"            as const satisfies CondicionIva

export interface ProveedorSeed {
  codigo: string
  nombreRazonSocial: string
  documento: string
  condicionIva: CondicionIva
  direccion: string
  localidad: string
  provincia: string
  telefono: string
  email: string
}

export const PROVEEDORES: ProveedorSeed[] = [
  {
    codigo: "20001",
    nombreRazonSocial: "Frutihortícola del Norte SRL",
    documento: generarCUIT("30", 71_230_001),
    condicionIva: RI,
    direccion: "Ruta 9 km 1490",
    localidad: "General Güemes",
    provincia: "Salta",
    telefono: "+54 387 4471234",
    email: "ventas@frutidelnorte.com.ar",
  },
  {
    codigo: "20002",
    nombreRazonSocial: "Cooperativa Hortícola Tucumán Ltda",
    documento: generarCUIT("30", 71_230_020),
    condicionIva: RI,
    direccion: "Av. Aconquija 2380",
    localidad: "Yerba Buena",
    provincia: "Tucumán",
    telefono: "+54 381 4255678",
    email: "administracion@coophortucuman.coop.ar",
  },
  {
    codigo: "20003",
    nombreRazonSocial: "Quinta Los Algarrobos",
    documento: generarCUIT("20", 16_540_300),
    condicionIva: MT,
    direccion: "Camino vecinal Los Algarrobos s/n",
    localidad: "Famaillá",
    provincia: "Tucumán",
    telefono: "+54 3863 421567",
    email: "losalgarrobos.famailla@gmail.com",
  },
  {
    codigo: "20004",
    nombreRazonSocial: "Frutícola San Pablo SA",
    documento: generarCUIT("30", 71_230_040),
    condicionIva: RI,
    direccion: "Ruta Provincial 60 km 12",
    localidad: "San Rafael",
    provincia: "Mendoza",
    telefono: "+54 260 4421987",
    email: "ventas@fruticolasanpablo.com.ar",
  },
  {
    codigo: "20005",
    nombreRazonSocial: "Distribuidora La Pampa SRL",
    documento: generarCUIT("30", 71_230_050),
    condicionIva: RI,
    direccion: "Av. San Martín 1850",
    localidad: "Santa Rosa",
    provincia: "La Pampa",
    telefono: "+54 2954 425678",
    email: "compras@distrilapampa.com.ar",
  },
  {
    codigo: "20006",
    nombreRazonSocial: "Hnos. Martínez Producciones",
    documento: generarCUIT("20", 22_100_600),
    condicionIva: MT,
    direccion: "Ruta 38 km 745, Lules",
    localidad: "Lules",
    provincia: "Tucumán",
    telefono: "+54 381 4889012",
    email: "hnosmartinez.lules@gmail.com",
  },
  {
    codigo: "20007",
    nombreRazonSocial: "Empacadora El Sol SA",
    documento: generarCUIT("30", 71_230_070),
    condicionIva: RI,
    direccion: "Parque Industrial Lote 14",
    localidad: "Villa Regina",
    provincia: "Río Negro",
    telefono: "+54 2941 463210",
    email: "comercial@empacadoraelsol.com.ar",
  },
  {
    codigo: "20008",
    nombreRazonSocial: "Frutihortícola Andes SRL",
    documento: generarCUIT("30", 71_230_080),
    condicionIva: RI,
    direccion: "Calle Mitre 980",
    localidad: "Tunuyán",
    provincia: "Mendoza",
    telefono: "+54 2622 422345",
    email: "ventas@andesfruti.com.ar",
  },
  {
    codigo: "20009",
    nombreRazonSocial: "Vivero Los Naranjos",
    documento: generarCUIT("30", 71_230_090),
    condicionIva: RI,
    direccion: "Ruta 14 km 245",
    localidad: "Concordia",
    provincia: "Entre Ríos",
    telefono: "+54 345 4231567",
    email: "info@losnaranjosvivero.com.ar",
  },
  {
    codigo: "20010",
    nombreRazonSocial: "Hortícola Salta SRL",
    documento: generarCUIT("30", 71_230_100),
    condicionIva: RI,
    direccion: "Av. Bolivia 4350",
    localidad: "Salta",
    provincia: "Salta",
    telefono: "+54 387 4357890",
    email: "administracion@horticolasalta.com.ar",
  },
  {
    codigo: "20011",
    nombreRazonSocial: "Distribuidora Buenavista SA",
    documento: generarCUIT("30", 71_230_110),
    condicionIva: RI,
    direccion: "Av. Hipólito Yrigoyen 13500",
    localidad: "Avellaneda",
    provincia: "Buenos Aires",
    telefono: "+54 11 42229876",
    email: "comercial@buenavistasa.com.ar",
  },
  {
    codigo: "20012",
    nombreRazonSocial: "Frutícola Patagonia SRL",
    documento: generarCUIT("30", 71_230_120),
    condicionIva: RI,
    direccion: "Calle 25 de Mayo 1245",
    localidad: "General Roca",
    provincia: "Río Negro",
    telefono: "+54 298 4432109",
    email: "ventas@patagoniafruti.com.ar",
  },
  {
    codigo: "20013",
    nombreRazonSocial: "Hortalizas del Valle",
    documento: generarCUIT("30", 71_230_130),
    condicionIva: RI,
    direccion: "Ruta 7 km 1085",
    localidad: "Luján de Cuyo",
    provincia: "Mendoza",
    telefono: "+54 261 4985432",
    email: "ventas@hortalizasdelvalle.com.ar",
  },
  {
    codigo: "20014",
    nombreRazonSocial: "Cítricos del NEA SA",
    documento: generarCUIT("30", 71_230_140),
    condicionIva: RI,
    direccion: "Ruta 12 km 1023",
    localidad: "Bella Vista",
    provincia: "Corrientes",
    telefono: "+54 3777 451234",
    email: "exportacion@citricosnea.com.ar",
  },
  {
    codigo: "20015",
    nombreRazonSocial: "Productor Don Roberto",
    documento: generarCUIT("20", 18_900_150),
    condicionIva: MT,
    direccion: "Camino Real s/n",
    localidad: "Trancas",
    provincia: "Tucumán",
    telefono: "+54 3862 491230",
    email: "donroberto.trancas@gmail.com",
  },
]
