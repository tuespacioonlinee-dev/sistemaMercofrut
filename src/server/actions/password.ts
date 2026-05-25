"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireSession, requireAdmin } from "@/lib/auth-guards"
import { cambiarPasswordSchema } from "@/lib/validaciones/password"

/**
 * Cambia la contraseña del usuario LOGUEADO (la suya propia).
 *
 * Se usa tanto en el cambio obligatorio del primer login como en un cambio
 * voluntario. Pide la contraseña actual para confirmar identidad.
 *
 * Al cambiarla se baja el flag `debeCambiarPassword`. El cliente debe llamar a
 * update() de la sesión (o re-loguear) para refrescar el token.
 */
export async function cambiarPasswordPropia(data: unknown) {
  const session = await requireSession()

  const parsed = cambiarPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const { passwordActual, passwordNueva } = parsed.data

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, activo: true },
  })
  if (!usuario || !usuario.activo) return { error: "Usuario no encontrado o inactivo." }

  const actualOk = await bcrypt.compare(passwordActual, usuario.passwordHash)
  if (!actualOk) return { error: "La contraseña actual es incorrecta." }

  const passwordHash = await bcrypt.hash(passwordNueva, 10)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash,
      debeCambiarPassword: false,
      passwordCambiadaEn: new Date(),
    },
  })

  revalidatePath("/")
  return { ok: true }
}

/**
 * Genera una contraseña temporal legible (sin caracteres ambiguos).
 * Formato: 3 letras + 4 números + 1 símbolo. Ej: "kde4827!"
 */
function generarPasswordTemporal(): string {
  const letras = "abcdefghijkmnpqrstuvwxyz" // sin l/o para evitar confusión
  const nums = "23456789" // sin 0/1
  const simbolos = "!@#$"
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("")
  return pick(letras, 3) + pick(nums, 4) + pick(simbolos, 1)
}

/**
 * RESETEO de contraseña por un ADMIN (nosotros, JDC).
 *
 * No existe recuperación self-service: el cliente NO puede resetear su propia
 * contraseña sin nosotros. El admin genera una temporal, se la comunica al
 * cliente por un canal seguro, y el cliente la cambia obligatoriamente en su
 * próximo login (debeCambiarPassword = true).
 *
 * Devuelve la temporal EN CLARO una sola vez para que el admin la copie. No se
 * guarda en ningún lado en texto plano.
 */
export async function resetearPasswordUsuario(userId: string) {
  await requireAdmin()

  const usuario = await prisma.usuario.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, nombre: true, email: true },
  })
  if (!usuario) return { error: "Usuario no encontrado." }

  const temporal = generarPasswordTemporal()
  const passwordHash = await bcrypt.hash(temporal, 10)

  await prisma.usuario.update({
    where: { id: userId },
    data: {
      passwordHash,
      debeCambiarPassword: true,
      passwordCambiadaEn: null,
    },
  })

  revalidatePath("/usuarios")
  return { ok: true, passwordTemporal: temporal, email: usuario.email, nombre: usuario.nombre }
}
