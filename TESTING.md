# Testing

## Cómo correr los tests

```bash
npm test           # modo watch (rebuildea al editar)
npm run test:run   # corrida única, ideal para CI / pre-commit
```

## Estructura

- **Unit tests** (validaciones, helpers puros): `src/**/*.test.ts`
- **E2E tests** (requieren navegador / DB): `src/**/*.e2e.test.ts` —
  *excluidos* del runner por defecto; correrlos con Playwright aparte
  cuando estén listos.

## Qué se testea hoy

| Archivo | Cubre |
|---|---|
| `src/lib/validaciones/__tests__/clientes.test.ts` | Schema Zod de cliente — validaciones básicas |

## Qué testear (orden sugerido por Juan)

Prioridad alta (lo que rompe plata real si falla):

1. **Schemas Zod** de validación — fáciles, sin mocks
   - `ventaSchema`, `compraSchema`, `cobroSchema`, etc.
2. **Helpers puros**
   - `formatearNumeroRemito` / `formatearNumeroFactura`
   - `determinarTipoFactura` (matriz IVA emisor × IVA receptor)
   - `calcularIva`
3. **E2E con Playwright** (rama aparte, `feature/juan-tests-e2e`)
   - Alta de cliente
   - Carga de venta con remito
   - Cobro de cuenta corriente con impacto en caja
   - Cierre de caja con validación de cuadre
   - Reporte de cta cte por persona

## Convenciones

- Tests usan `vitest` (no `jest`)
- Pueden importar desde `@/lib/...` y `@/server/...` igual que el código de la app
- Si un test necesita mockear Prisma, usar `vi.mock("@/lib/prisma", ...)`
- Para E2E con DB real: usar una DB de prueba separada con `DATABASE_URL_TEST`
  y un script `npm run test:e2e` que la prepare/limpie
