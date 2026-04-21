import { z } from "zod"
import { RolUsuario } from "@prisma/client"

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  email: z.string().email("Email inválido").max(200).trim().toLowerCase(),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
  rol: z.nativeEnum(RolUsuario, { message: "Rol inválido" }),
})

export const editarUsuarioSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100).trim(),
  email: z.string().email("Email inválido").max(200).trim().toLowerCase(),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100).optional().or(z.literal("")),
  rol: z.nativeEnum(RolUsuario, { message: "Rol inválido" }),
  activo: z.boolean(),
})

export const etiquetasRol: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  COMPRADOR: "Comprador",
  CONSULTA: "Consulta",
}
