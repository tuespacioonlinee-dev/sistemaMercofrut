import { RolUsuario } from "@prisma/client"
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      rol: RolUsuario
      debeCambiarPassword: boolean
    }
  }
  interface User {
    rol: RolUsuario
    debeCambiarPassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    rol: RolUsuario
    debeCambiarPassword: boolean
  }
}
