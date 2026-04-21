import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("admin123", 10)

  const usuario = await prisma.usuario.upsert({
    where: { email: "admin@sistemacono.com" },
    update: {},
    create: {
      email: "admin@sistemacono.com",
      nombre: "Administrador",
      passwordHash: hash,
      rol: "ADMIN",
    },
  })

  console.log("✅ Usuario creado:", usuario.email)
  console.log("   Contraseña: admin123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
