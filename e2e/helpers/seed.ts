// e2e/helpers/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const TEST_USER = {
  email: "test-e2e@mercofrut.com",
  password: "test1234",
  nombre: "Test E2E",
};

export const TEST_PRODUCT = {
  codigo: "TEST-E2E-001",
  nombre: "Manzana Test E2E",
  precioVenta: 1500,
  precioCompra: 800,
  stockInicial: 100,
};

export const TEST_CLIENTE_CONTADO = {
  nombreRazonSocial: "Cliente Test Contado E2E",
  documento: "99000001",
};

export const TEST_CLIENTE_CC = {
  nombreRazonSocial: "Cliente Test CC E2E",
  documento: "99000002",
};

interface SeedIds {
  userId: string;
  categoriaId: string;
  unidadId: string;
  productoId: string;
  clienteContadoId: string;
  clienteCcId: string;
  cuentaCcId: string;
  parametrosComprobanteId: string;
}

let seedIds: SeedIds | null = null;

export async function seed(): Promise<SeedIds> {
  // Pre-cleanup: eliminar datos sucios de runs anteriores que crashearon
  const existingUser = await prisma.usuario.findUnique({
    where: { email: TEST_USER.email },
  });
  if (existingUser) {
    // Hay datos sucios — limpiar antes de seedear
    const existingClientes = await prisma.cliente.findMany({
      where: {
        documento: {
          in: [TEST_CLIENTE_CONTADO.documento, TEST_CLIENTE_CC.documento],
        },
      },
    });
    const clienteIds = existingClientes.map((c) => c.id);

    await prisma.movimientoCaja.deleteMany({
      where: { usuario: { email: TEST_USER.email } },
    });
    await prisma.cajaDiaria.deleteMany({
      where: { abiertaPor: { email: TEST_USER.email } },
    });
    await prisma.movimientoCuenta.deleteMany({
      where: { usuario: { email: TEST_USER.email } },
    });
    await prisma.detalleVenta.deleteMany({
      where: { producto: { codigo: TEST_PRODUCT.codigo } },
    });
    await prisma.factura.deleteMany({
      where: { venta: { creadaPor: { email: TEST_USER.email } } },
    });
    await prisma.remito.deleteMany({
      where: { venta: { creadaPor: { email: TEST_USER.email } } },
    });
    await prisma.venta.deleteMany({
      where: { creadaPor: { email: TEST_USER.email } },
    });
    await prisma.movimientoStock.deleteMany({
      where: { usuario: { email: TEST_USER.email } },
    });
    if (clienteIds.length > 0) {
      await prisma.cuenta.deleteMany({
        where: {
          OR: [
            { clienteId: { in: clienteIds } },
            { nombre: "Contado", titular: "PROPIA" },
          ],
        },
      });
      await prisma.cliente.deleteMany({
        where: { id: { in: clienteIds } },
      });
    }
    await prisma.producto.deleteMany({
      where: { codigo: TEST_PRODUCT.codigo },
    });
    await prisma.categoria.deleteMany({
      where: { nombre: "Frutas E2E" },
    });
    await prisma.unidadMedida.deleteMany({
      where: { abreviatura: "KgE2E" },
    });
    await prisma.usuario.deleteMany({
      where: { email: TEST_USER.email },
    });
  }

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email: TEST_USER.email,
      nombre: TEST_USER.nombre,
      passwordHash,
      rol: "ADMIN",
    },
  });

  const categoria = await prisma.categoria.create({
    data: { nombre: "Frutas E2E" },
  });

  const unidad = await prisma.unidadMedida.create({
    data: { nombre: "Kilogramo E2E", abreviatura: "KgE2E" },
  });

  const producto = await prisma.producto.create({
    data: {
      codigo: TEST_PRODUCT.codigo,
      nombre: TEST_PRODUCT.nombre,
      categoriaId: categoria.id,
      unidadBaseId: unidad.id,
      precioVenta: TEST_PRODUCT.precioVenta,
      precioCompra: TEST_PRODUCT.precioCompra,
      stockTotal: TEST_PRODUCT.stockInicial,
    },
  });

  const clienteContado = await prisma.cliente.create({
    data: {
      nombreRazonSocial: TEST_CLIENTE_CONTADO.nombreRazonSocial,
      documento: TEST_CLIENTE_CONTADO.documento,
      tipoDocumento: "DNI",
      condicionIva: "CONSUMIDOR_FINAL",
    },
  });

  const clienteCc = await prisma.cliente.create({
    data: {
      nombreRazonSocial: TEST_CLIENTE_CC.nombreRazonSocial,
      documento: TEST_CLIENTE_CC.documento,
      tipoDocumento: "DNI",
      condicionIva: "CONSUMIDOR_FINAL",
    },
  });

  const cuentaCc = await prisma.cuenta.create({
    data: {
      nombre: `CC ${TEST_CLIENTE_CC.nombreRazonSocial}`,
      tipo: "CORRIENTE",
      titular: "CLIENTE",
      clienteId: clienteCc.id,
      saldo: 0,
    },
  });

  const cuentaContado = await prisma.cuenta.create({
    data: {
      nombre: "Contado",
      tipo: "CONTADO",
      titular: "PROPIA",
      saldo: 0,
    },
  });

  // Calcular próximo número de remito para evitar unique constraint
  const lastRemito = await prisma.remito.findFirst({
    orderBy: { id: "desc" },
    select: { numero: true },
  });
  const currentMax = lastRemito
    ? parseInt(lastRemito.numero.split("-")[1] || "0", 10)
    : 0;
  const proximoRemito = Math.max(currentMax + 1, 90000);

  const parametrosComprobante = await prisma.parametrosComprobante.upsert({
    where: { puntoVenta: 1 },
    update: { proximoRemito },
    create: { puntoVenta: 1, proximoRemito },
  });

  seedIds = {
    userId: usuario.id,
    categoriaId: categoria.id,
    unidadId: unidad.id,
    productoId: producto.id,
    clienteContadoId: clienteContado.id,
    clienteCcId: clienteCc.id,
    cuentaCcId: cuentaCc.id,
    parametrosComprobanteId: parametrosComprobante.id,
  };

  return seedIds;
}

export async function cleanup(): Promise<void> {
  if (!seedIds) return;

  await prisma.movimientoCaja.deleteMany({
    where: { usuario: { email: TEST_USER.email } },
  });
  await prisma.cajaDiaria.deleteMany({
    where: { abiertaPor: { email: TEST_USER.email } },
  });
  await prisma.movimientoCuenta.deleteMany({
    where: { usuario: { email: TEST_USER.email } },
  });
  await prisma.detalleVenta.deleteMany({
    where: { producto: { codigo: TEST_PRODUCT.codigo } },
  });
  await prisma.factura.deleteMany({
    where: { venta: { creadaPor: { email: TEST_USER.email } } },
  });
  await prisma.remito.deleteMany({
    where: { venta: { creadaPor: { email: TEST_USER.email } } },
  });
  await prisma.venta.deleteMany({
    where: { creadaPor: { email: TEST_USER.email } },
  });
  await prisma.movimientoStock.deleteMany({
    where: { usuario: { email: TEST_USER.email } },
  });
  await prisma.cuenta.deleteMany({
    where: {
      OR: [
        { clienteId: seedIds.clienteContadoId },
        { clienteId: seedIds.clienteCcId },
        { nombre: "Contado", titular: "PROPIA" },
      ],
    },
  });
  await prisma.cliente.deleteMany({
    where: {
      id: { in: [seedIds.clienteContadoId, seedIds.clienteCcId] },
    },
  });
  await prisma.producto.deleteMany({
    where: { codigo: TEST_PRODUCT.codigo },
  });
  await prisma.categoria.deleteMany({
    where: { id: seedIds.categoriaId },
  });
  await prisma.unidadMedida.deleteMany({
    where: { id: seedIds.unidadId },
  });
  await prisma.usuario.deleteMany({
    where: { email: TEST_USER.email },
  });

  seedIds = null;
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
