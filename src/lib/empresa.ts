import "server-only"
import { cache } from "react"
import { CondicionIva } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface EmpresaInfo {
  nombreFantasia: string
  razonSocial: string
  cuit: string
  direccion: string
  localidad: string
  telefono: string | null
  email: string | null
  logoUrl: string | null
  ingresosBrutos: string | null
  condicionIva: CondicionIva
  facturacionHabilitada: boolean
}

const DEFAULTS: EmpresaInfo = {
  nombreFantasia: process.env.NEXT_PUBLIC_NEGOCIO_NOMBRE ?? "Mi Empresa",
  razonSocial:    process.env.NEGOCIO_RAZON_SOCIAL ?? "",
  cuit:           process.env.NEGOCIO_CUIT ?? "",
  direccion:      process.env.NEGOCIO_DIRECCION ?? "",
  localidad:      process.env.NEGOCIO_LOCALIDAD ?? "",
  telefono:       null,
  email:          null,
  logoUrl:        null,
  ingresosBrutos: null,
  condicionIva:   CondicionIva.CONSUMIDOR_FINAL,
  facturacionHabilitada: false,
}

/**
 * Lee los parámetros del negocio desde la base. Cacheado por request.
 * Si todavía no hay parámetros cargados (instalación nueva), devuelve defaults
 * leídos de env vars así el sistema arranca sin romperse.
 */
export const getEmpresa = cache(async (): Promise<EmpresaInfo> => {
  const p = await prisma.parametrosNegocio.findFirst()
  if (!p) return DEFAULTS
  return {
    nombreFantasia: p.nombreFantasia,
    razonSocial:    p.razonSocial,
    cuit:           p.cuit,
    direccion:      p.direccion,
    localidad:      p.localidad,
    telefono:       p.telefono,
    email:          p.email,
    logoUrl:        p.logoUrl,
    ingresosBrutos: p.ingresosBrutos,
    condicionIva:   p.condicionIva,
    facturacionHabilitada: p.facturacionHabilitada,
  }
})

/** Subtítulo corto para headers de PDFs y reportes ("Nombre — Localidad") */
export function empresaSubtitulo(e: EmpresaInfo): string {
  return e.localidad ? `${e.nombreFantasia} — ${e.localidad}` : e.nombreFantasia
}
