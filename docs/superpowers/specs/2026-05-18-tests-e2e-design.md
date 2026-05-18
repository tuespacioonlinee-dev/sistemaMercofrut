# Tests E2E — Spec de Diseño

## Resumen

Suite de tests end-to-end con Playwright que verifica los flujos críticos del sistema Mercofrut: login, caja diaria, ventas (contado y cuenta corriente) y cobros. Los tests corren contra la app en localhost con datos de prueba seedeados via Prisma.

## Decisiones

| Decisión | Elección | Alternativas descartadas |
|----------|----------|--------------------------|
| Framework | Playwright | Cypress (más lento, peor integración Next.js) |
| Browsers | Solo Chromium | Multi-browser (innecesario para app interna) |
| Datos de prueba | Seed via Prisma Client directo | Fixtures estáticos, API calls |
| Auth en tests | Login via UI una vez, reusar sesión | Inyectar cookie directamente |
| CI | No por ahora | GitHub Action en cada PR (paso futuro) |

## Flujos testeados

### 1. Auth (`auth.spec.ts`)
- Login con credenciales válidas → redirect a dashboard
- Login con credenciales inválidas → muestra error, no navega

### 2. Caja diaria (`caja.spec.ts`)
- Abrir caja con saldo inicial → verificar estado ABIERTA en la UI
- Cerrar caja con monto de arqueo → verificar estado CERRADA
- No se puede abrir otra caja si hay una abierta

### 3. Venta contado (`venta-contado.spec.ts`)
- Crear venta contado: seleccionar cliente → agregar producto → confirmar
- Verificar que la venta aparece en el listado de ventas
- Verificar que el stock del producto bajó la cantidad vendida

### 4. Venta cuenta corriente (`venta-cuenta-corriente.spec.ts`)
- Crear venta a cuenta corriente: seleccionar cliente con cuenta CC
- Verificar que el saldo de la cuenta del cliente aumentó por el total de la venta

### 5. Cobro (`cobro.spec.ts`)
- Realizar cobro parcial a un cliente con saldo pendiente
- Verificar que el saldo de la cuenta bajó por el monto cobrado

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `playwright.config.ts` | Configuración: base URL, webServer, proyecto Chromium, timeouts |
| `e2e/helpers/auth.ts` | Helper: login via UI, guardar estado de sesión |
| `e2e/helpers/seed.ts` | Helper: seedear y limpiar datos de prueba via Prisma |
| `e2e/auth.spec.ts` | Tests de autenticación |
| `e2e/caja.spec.ts` | Tests de caja diaria (apertura/cierre) |
| `e2e/venta-contado.spec.ts` | Tests de venta contado |
| `e2e/venta-cuenta-corriente.spec.ts` | Tests de venta cuenta corriente |
| `e2e/cobro.spec.ts` | Tests de cobro a cliente |

## Setup técnico

### playwright.config.ts

```
- baseURL: http://localhost:3000
- webServer: npm run dev (arranca automáticamente)
- projects: [{ name: "chromium", use: devices["Desktop Chrome"] }]
- testDir: ./e2e
- timeout por test: 30 segundos
- retries: 0 en local, 1 en CI
```

### Helper de autenticación (e2e/helpers/auth.ts)

- Función `login(page, email, password)`: navega a `/login`, llena email y password, hace click en submit, espera redirect a dashboard
- Los tests que necesitan estar logueados llaman a este helper en `beforeEach`

### Helper de datos (e2e/helpers/seed.ts)

Usa PrismaClient directo (no HTTP) para insertar datos de prueba antes de los tests y limpiarlos después.

**Datos que seedea:**
- 1 categoría: "Frutas"
- 1 unidad de medida: "Kg"
- 1 producto: "Manzana Test" con stock 100, precio venta 1500
- 1 cliente (contado): "Cliente Test Contado" con documento único
- 1 cliente (CC): "Cliente Test CC" con documento único + cuenta corriente con saldo 0
- 1 usuario admin: email "test@mercofrut.com", password "test1234"
- 1 ParametrosComprobante (punto de venta 1, numeración inicial)

**Cleanup:** Borra todo lo creado en orden inverso a las FK (detalles → ventas → movimientos → cuentas → clientes → productos → categorías → unidades → usuario).

### Ejecución

```bash
# Instalar browsers (una sola vez)
npx playwright install chromium

# Correr todos los tests
npm run test:e2e

# Correr un test específico
npx playwright test auth

# Ver reporte visual
npx playwright show-report
```

### npm scripts

```json
"test:e2e": "playwright test"
```

## Dependencias nuevas

| Paquete | Propósito |
|---------|-----------|
| `@playwright/test` | Framework de testing E2E |

Se instala como devDependency.

## Consideraciones

- Los tests asumen que la app corre en `localhost:3000` con la DB de desarrollo
- El seed crea datos con identificadores predecibles para poder buscarlos en la UI
- Cada archivo de test es independiente — se puede correr solo sin depender de otros
- El helper de seed se conecta a la DB directamente, no pasa por la API de la app
- Los tests interactúan con la UI buscando por texto visible, roles ARIA, o data-testid cuando sea necesario
