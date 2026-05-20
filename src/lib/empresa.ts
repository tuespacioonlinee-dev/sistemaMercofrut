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

// Algunos valores del .env.example original eran placeholders ("Mi Empresa",
// "A completar") que la gente suele copiar tal cual a Vercel sin actualizar.
// Tratamos esos placeholders como "no seteado" para evitar que se queden
// pegados en producción y se vea "Mi Empresa" en el login del cliente.
const PLACEHOLDERS = new Set(["", "Mi Empresa", "A completar", "00-00000000-0"])

function envOrDefault(envKey: string, fallback: string): string {
  const raw = process.env[envKey]?.trim() ?? ""
  return PLACEHOLDERS.has(raw) ? fallback : raw
}

const DEFAULTS: EmpresaInfo = {
  nombreFantasia: envOrDefault("NEXT_PUBLIC_NEGOCIO_NOMBRE", "JDC Mercofrut"),
  razonSocial:    envOrDefault("NEGOCIO_RAZON_SOCIAL",       ""),
  cuit:           envOrDefault("NEGOCIO_CUIT",               ""),
  direccion:      envOrDefault("NEGOCIO_DIRECCION",          ""),
  localidad:      envOrDefault("NEGOCIO_LOCALIDAD",          ""),
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
