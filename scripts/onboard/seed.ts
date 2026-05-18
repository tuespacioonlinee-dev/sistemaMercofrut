// scripts/onboard/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { OnboardArgs } from "./args";

export async function seedClient(
  databaseUrl: string,
  args: OnboardArgs
): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    const passwordHash = await bcrypt.hash(args.password, 10);

    await prisma.usuario.create({
      data: {
        email: args.email,
        nombre: "Administrador",
        passwordHash,
        rol: "ADMIN",
      },
    });

    await prisma.parametrosNegocio.create({
      data: {
        nombreFantasia: args.nombre,
        razonSocial: args.nombre,
        cuit: args.cuit,
        condicionIva: args.condicionIva,
        direccion: args.direccion,
        localidad: "",
      },
    });

    console.log(`   Usuario: ${args.email} (ADMIN)`);
    console.log(`   Negocio: ${args.nombre} (CUIT: ${args.cuit})`);
  } finally {
    await prisma.$disconnect();
  }
}
