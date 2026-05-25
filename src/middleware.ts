import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const path = req.nextUrl.pathname
  const isLoginPage = path === "/login"
  const isCambioPassPage = path === "/cambiar-password"
  const debeCambiar = req.auth?.user?.debeCambiarPassword === true

  // No logueado → al login (excepto si ya está ahí)
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn) {
    // Usuario obligado a cambiar contraseña: queda "atrapado" en /cambiar-password
    // hasta que la cambie. No puede ir a ninguna otra pantalla.
    if (debeCambiar && !isCambioPassPage) {
      return NextResponse.redirect(new URL("/cambiar-password", req.url))
    }

    // Si ya cambió (o no debe), no tiene sentido que esté en /cambiar-password
    if (!debeCambiar && isCambioPassPage) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // Logueado yendo al login → al inicio
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
