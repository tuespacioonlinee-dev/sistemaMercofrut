import "server-only"
import { RolUsuario } from "@prisma/client"
import { auth } from "@/lib/auth"

/**
 * Error que se lanza cuando una server action es invocada sin la autorización
 * adecuada. Es importante que sea distinguible (extends Error con name propio)
 * para que el código que llama pueda diferenciarlo de errores de negocio.
 */
export class AuthorizationError extends Error {
  constructor(message = "No autorizado") {
    super(message)
    this.name = "AuthorizationError"
  }
}

/**
 * Garantiza que hay una sesión activa. Devuelve la sesión.
 * Usar al inicio de cualquier server action que requiera estar logueado.
 */
export async function requireSession() {
  const session = await auth()
  if (!session?.user) {
    throw new AuthorizationError("Sesión requerida")
  }
  return session
}

/**
 * Garantiza que hay sesión activa Y que el rol del usuario está en la lista.
 * Usar al inicio de toda server action que MUTE datos.
 *
 * @example
 *   await requireRole(RolUsuario.ADMIN, RolUsuario.COMPRADOR)
 */
export async function requireRole(...allowedRoles: RolUsuario[]) {
  const session = await requireSession()
  if (!allowedRoles.includes(session.user.rol as RolUsuario)) {
    throw new AuthorizationError("Sin permisos para esta acción")
  }
  return session
}

/**
 * Helper que solo permite ADMIN. Atajo cómodo.
 */
export async function requireAdmin() {
  return requireRole(RolUsuario.ADMIN)
}
