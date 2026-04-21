import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { loginSchema } from "./validaciones/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: parsed.data.email },
        })

        if (!usuario || !usuario.activo) return null

        const ok = await bcrypt.compare(parsed.data.password, usuario.passwordHash)
        if (!ok) return null

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.rol = user.rol
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.rol = token.rol
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
})
