# Manual de Usuario PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLI script that generates a complete user manual PDF for the Mercofrut system, covering all 12 modules with step-by-step instructions in informal Argentine Spanish.

**Architecture:** Three files following the `scripts/validate/` pattern: a content file with all 12 chapters as structured data, a React-PDF component with typography helpers and page layout, and an orchestrator script. The manual is generated offline with `npm run manual`.

**Tech Stack:** TypeScript, @react-pdf/renderer (renderToBuffer), date-fns

**Spec:** `docs/superpowers/specs/2026-05-18-manual-usuario-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/manual/content.ts` | All 12 chapters as typed data: titles, paragraphs, steps |
| `scripts/manual/pdf.tsx` | React-PDF component with typography helpers, cover page, header/footer |
| `scripts/generate-manual.tsx` | Orchestrator: import content, render PDF, write file |

---

### Task 1: Content — chapters 1-6 (daily operations)

**Files:**
- Create: `scripts/manual/content.ts`

This task creates the content file with the type definitions and the first 6 chapters (the daily workflow chapters). Task 2 adds chapters 7-12.

- [ ] **Step 1: Create content.ts with types and chapters 1-6**

```ts
// scripts/manual/content.ts

export interface Paso {
  texto: string;
}

export interface Seccion {
  titulo: string;
  parrafos: string[];
  pasos?: Paso[];
}

export interface Capitulo {
  numero: number;
  titulo: string;
  secciones: Seccion[];
}

export const capitulos: Capitulo[] = [
  {
    numero: 1,
    titulo: "Primeros pasos",
    secciones: [
      {
        titulo: "Cómo entrar al sistema",
        parrafos: [
          "Para usar Mercofrut necesitás un email y una contraseña que te da el administrador del sistema.",
        ],
        pasos: [
          { texto: "Abrí el navegador (Chrome, Firefox, etc.) y entrá a la dirección web que te dieron." },
          { texto: "En el campo \"Email\" escribí tu email. En el campo \"Contraseña\" escribí tu contraseña." },
          { texto: "Hacé click en \"Ingresar\"." },
          { texto: "Si los datos son correctos, vas a ver la pantalla principal. Si son incorrectos, vas a ver el mensaje \"Email o contraseña incorrectos\"." },
        ],
      },
      {
        titulo: "Pantalla principal",
        parrafos: [
          "Después de entrar vas a ver el panel principal con un resumen general del sistema. A la izquierda tenés el menú con todas las secciones.",
        ],
      },
      {
        titulo: "Navegación",
        parrafos: [
          "El menú de la izquierda tiene todas las secciones del sistema: Panel, Productos, Categorías, Unidades, Proveedores, Compras, Precios, Stock, Lotes, Ventas, Clientes, Caja y Reportes.",
          "Para ir a cualquier sección, hacé click en su nombre en el menú.",
          "Para cerrar sesión, hacé click en \"Cerrar sesión\" al final del menú.",
        ],
      },
    ],
  },
  {
    numero: 2,
    titulo: "Caja diaria",
    secciones: [
      {
        titulo: "Abrir la caja",
        parrafos: [
          "Todos los días, antes de empezar a vender, tenés que abrir la caja. Esto registra cuánto dinero hay en la caja al inicio del día.",
        ],
        pasos: [
          { texto: "Hacé click en \"Caja\" en el menú." },
          { texto: "Si no hay caja abierta, vas a ver el mensaje \"No hay caja abierta\" y el formulario para abrir una." },
          { texto: "En \"Saldo inicial ($)\" poné la cantidad de dinero que hay en la caja al empezar (por ejemplo: 5000)." },
          { texto: "Si querés, escribí algo en \"Observaciones\" (es opcional, por ejemplo: \"cambio en efectivo\")." },
          { texto: "Hacé click en \"Abrir caja\"." },
          { texto: "La pantalla va a cambiar y vas a ver los movimientos del día, las tarjetas de Ingresos, Egresos, Debe CC y Haber CC." },
        ],
      },
      {
        titulo: "Ver los movimientos del día",
        parrafos: [
          "Una vez que la caja está abierta, la pantalla de Caja muestra todo lo que pasó en el día.",
          "Arriba tenés 4 tarjetas con los totales: Ingresos (efectivo que entró), Egresos (efectivo que salió), Debe CC (ventas a cuenta corriente) y Haber CC (cobros de cuenta corriente).",
          "Abajo tenés la tabla \"Movimientos del día\" con cada operación del día: ventas, cobros, pagos, gastos, etc.",
          "También podés ver el saldo inicial, el saldo de caja actual y la diferencia del día.",
        ],
      },
      {
        titulo: "Registrar un movimiento manual",
        parrafos: [
          "Si necesitás registrar un gasto, retiro, depósito u otro movimiento que no viene de una venta o cobro, podés hacerlo desde la caja.",
        ],
        pasos: [
          { texto: "En la sección \"Nuevo movimiento\" (a la derecha), elegí la \"Categoría\" del movimiento (Gasto, Retiro, Depósito, Otro)." },
          { texto: "Si corresponde, elegí si es ingreso (HABER) o egreso (DEBE)." },
          { texto: "Poné el monto en \"Monto ($)\"." },
          { texto: "Escribí una descripción en \"Descripción\" (por ejemplo: \"pago luz\")." },
          { texto: "Hacé click en \"Registrar movimiento\"." },
        ],
      },
      {
        titulo: "Cerrar la caja",
        parrafos: [
          "Al terminar el día, cerrás la caja. Tenés que contar el dinero que hay en la caja y cargarlo. El sistema calcula si hay diferencia con lo esperado.",
        ],
        pasos: [
          { texto: "En la sección \"Cerrar caja\" (a la derecha), vas a ver los totales del día separados en Contado y Cuenta Corriente." },
          { texto: "Contá el dinero que hay físicamente en la caja." },
          { texto: "Poné ese número en \"Dinero contado en caja ($)\"." },
          { texto: "El sistema te muestra el \"Saldo esperado\", el \"Dinero contado\" y la \"Diferencia\". Si la diferencia es 0, está todo bien." },
          { texto: "Si querés, escribí algo en \"Observaciones\" (por ejemplo: \"faltaron $200, revisar\")." },
          { texto: "Hacé click en \"Cerrar caja\" (botón rojo). La caja queda cerrada y no se pueden hacer más operaciones hasta abrir una nueva." },
        ],
      },
    ],
  },
  {
    numero: 3,
    titulo: "Ventas",
    secciones: [
      {
        titulo: "Crear una venta",
        parrafos: [
          "Para registrar una venta necesitás tener la caja abierta. Si la caja está cerrada, primero abrila (ver capítulo 2).",
        ],
        pasos: [
          { texto: "Hacé click en \"Ventas\" en el menú." },
          { texto: "Hacé click en \"Nueva venta\"." },
          { texto: "En \"Cliente\" buscá y seleccioná el cliente. Si es un cliente que paga en el momento, elegí cualquier cliente de contado." },
          { texto: "En \"Condición de venta\" elegí \"Contado\" si paga ahora, o \"Cuenta Corriente\" si queda a cuenta." },
          { texto: "Hacé click en \"Agregar producto\" para agregar una línea de producto." },
          { texto: "Seleccioná el producto de la lista. Vas a ver el stock disponible al lado." },
          { texto: "Poné la cantidad que se lleva." },
          { texto: "Si querés agregar más productos, volvé a hacer click en \"Agregar producto\" y repetí." },
          { texto: "Si querés hacer un descuento, usá el campo \"Descuento\" (podés poner un monto en $ o un porcentaje con %)." },
          { texto: "Verificá que el \"Total\" sea correcto." },
          { texto: "Hacé click en \"Confirmar venta\"." },
          { texto: "El sistema te confirma con el mensaje \"Venta registrada correctamente.\" y genera un remito automáticamente." },
        ],
      },
      {
        titulo: "Ver las ventas del día",
        parrafos: [
          "Para ver todas las ventas hechas, hacé click en \"Ventas\" en el menú. Vas a ver el listado con todas las ventas, el cliente, la condición (Contado o CC) y el total.",
        ],
      },
      {
        titulo: "Anular una venta",
        parrafos: [
          "Si te equivocaste en una venta, podés anularla. La anulación devuelve el stock y revierte el movimiento de caja o cuenta corriente.",
          "Entrá al detalle de la venta haciendo click en ella, y usá el botón de anular. El sistema te va a pedir el motivo.",
        ],
      },
    ],
  },
  {
    numero: 4,
    titulo: "Cobros",
    secciones: [
      {
        titulo: "Cobrar a un cliente",
        parrafos: [
          "Cuando un cliente que compra a cuenta corriente viene a pagar lo que debe, registrás un cobro. Necesitás tener la caja abierta.",
        ],
        pasos: [
          { texto: "Hacé click en \"Caja\" en el menú (los cobros se registran desde la sección de caja o cuentas corrientes)." },
          { texto: "Buscá \"Registrar cobro\" o andá a la sección de cobros." },
          { texto: "En \"Cliente / Cuenta\" buscá el cliente escribiendo su nombre. Seleccionalo de la lista." },
          { texto: "Vas a ver el \"Saldo actual\" del cliente (lo que debe)." },
          { texto: "En \"Monto cobrado ($)\" poné cuánto te paga. Puede ser el total o un pago parcial." },
          { texto: "En \"Concepto\" escribí algo como \"Pago factura\" o \"Abono parcial\"." },
          { texto: "Hacé click en \"Registrar cobro\"." },
          { texto: "El saldo del cliente baja por el monto cobrado." },
        ],
      },
    ],
  },
  {
    numero: 5,
    titulo: "Compras",
    secciones: [
      {
        titulo: "Registrar una compra",
        parrafos: [
          "Cuando recibís mercadería de un proveedor, registrás la compra para que el stock se actualice automáticamente.",
        ],
        pasos: [
          { texto: "Hacé click en \"Compras\" en el menú." },
          { texto: "Hacé click en \"Nueva compra\"." },
          { texto: "En \"Proveedor\" seleccioná el proveedor que te vendió la mercadería." },
          { texto: "En \"Condición de pago\" elegí \"Contado\" si le pagaste ya, o \"Cuenta Corriente\" si quedás debiendo." },
          { texto: "Si tenés el comprobante del proveedor, podés elegir el \"Tipo de comprobante\" (Factura A, B, etc.) y el \"N° Comprobante\"." },
          { texto: "Hacé click en \"Agregar fila\" para agregar un producto." },
          { texto: "Seleccioná el producto, poné la cantidad que recibiste y el precio que te cobró el proveedor." },
          { texto: "Si hay más productos, repetí el paso anterior." },
          { texto: "Verificá el total y hacé click en \"Registrar compra\"." },
          { texto: "El sistema confirma con \"Compra registrada. Stock actualizado.\" y el stock de los productos se incrementa automáticamente." },
        ],
      },
      {
        titulo: "Ver las compras",
        parrafos: [
          "Para ver todas las compras registradas, hacé click en \"Compras\" en el menú. Vas a ver el listado con proveedor, fecha, condición y total.",
        ],
      },
    ],
  },
  {
    numero: 6,
    titulo: "Pagos a proveedores",
    secciones: [
      {
        titulo: "Pagar a un proveedor",
        parrafos: [
          "Cuando le pagás a un proveedor que te vendió a cuenta corriente, registrás un pago. Es similar a registrar un cobro, pero al revés.",
        ],
        pasos: [
          { texto: "Buscá la sección de pagos o cuentas corrientes de proveedores." },
          { texto: "Buscá el proveedor al que querés pagarle." },
          { texto: "Vas a ver el saldo que le debés." },
          { texto: "Ingresá el monto que le pagás." },
          { texto: "Hacé click en registrar el pago." },
          { texto: "El saldo con el proveedor baja por el monto pagado." },
        ],
      },
    ],
  },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { capitulos } from './scripts/manual/content'; console.log('OK:', capitulos.length, 'capitulos')"`

Expected: `OK: 6 capitulos`

- [ ] **Step 3: Commit**

```bash
git add scripts/manual/content.ts
git commit -m "feat(manual): content chapters 1-6 — daily operations"
```

---

### Task 2: Content — chapters 7-12 (management & config)

**Files:**
- Modify: `scripts/manual/content.ts` — append chapters 7-12 to the `capitulos` array

- [ ] **Step 1: Add chapters 7-12 to content.ts**

Append these 6 chapters to the existing `capitulos` array (before the closing `];`):

```ts
  {
    numero: 7,
    titulo: "Productos",
    secciones: [
      {
        titulo: "Agregar un producto",
        parrafos: [
          "Antes de poder vender o comprar un producto, tenés que cargarlo en el sistema.",
        ],
        pasos: [
          { texto: "Hacé click en \"Productos\" en el menú." },
          { texto: "Hacé click en \"Nuevo producto\"." },
          { texto: "Completá el \"Código\" (por ejemplo: MAN-001). Tiene que ser único." },
          { texto: "Completá el \"Nombre\" (por ejemplo: Manzana Red)." },
          { texto: "Elegí la \"Categoría\" de la lista (por ejemplo: Frutas). Si no existe, primero tenés que crearla en Categorías." },
          { texto: "Elegí la \"Unidad base\" (por ejemplo: Kilogramo). Si no existe, primero creala en Unidades." },
          { texto: "Poné el \"Precio de venta\" (lo que le cobrás al cliente)." },
          { texto: "Poné el \"Precio de compra\" (lo que te cobra el proveedor). Es opcional." },
          { texto: "Si querés, poné un \"Stock mínimo\" para que el sistema te avise cuando quede poco." },
          { texto: "Si el producto tiene fecha de vencimiento, activá \"Controla vencimiento\"." },
          { texto: "Hacé click en \"Crear producto\"." },
        ],
      },
      {
        titulo: "Editar un producto",
        parrafos: [
          "Para editar un producto existente, hacé click en el producto en la lista. Se abre el formulario con los datos actuales. Modificá lo que necesites y hacé click en \"Guardar cambios\".",
        ],
      },
      {
        titulo: "Categorías",
        parrafos: [
          "Las categorías sirven para agrupar productos (por ejemplo: Frutas, Verduras, Lácteos).",
          "Para gestionar categorías, hacé click en \"Categorías\" en el menú. Podés agregar nuevas o editar las existentes.",
        ],
      },
      {
        titulo: "Unidades de medida",
        parrafos: [
          "Las unidades definen cómo se mide cada producto (Kilogramo, Unidad, Cajón, etc.).",
          "Para gestionar unidades, hacé click en \"Unidades\" en el menú. Podés agregar nuevas o editar las existentes.",
        ],
      },
      {
        titulo: "Precios",
        parrafos: [
          "Para actualizar los precios de venta y compra de los productos, podés hacerlo desde la sección \"Precios\" en el menú. Ahí ves todos los productos con sus precios actuales y los podés modificar rápidamente.",
        ],
      },
    ],
  },
  {
    numero: 8,
    titulo: "Clientes",
    secciones: [
      {
        titulo: "Agregar un cliente",
        parrafos: [
          "Para venderle a alguien a cuenta corriente, primero tenés que cargarlo como cliente en el sistema.",
        ],
        pasos: [
          { texto: "Hacé click en \"Clientes\" en el menú." },
          { texto: "Hacé click en \"Nuevo cliente\"." },
          { texto: "Completá \"Nombre / Razón Social\" (por ejemplo: Juan García o Frutas Pérez S.R.L.)." },
          { texto: "Elegí el \"Tipo de documento\" (DNI, CUIT, etc.) y completá el \"Número de documento\"." },
          { texto: "Elegí la \"Condición IVA\" del cliente (Consumidor Final, Monotributo, Responsable Inscripto, etc.)." },
          { texto: "Completá los datos de contacto: teléfono, email, dirección, localidad (son opcionales)." },
          { texto: "Hacé click en \"Crear cliente\"." },
        ],
      },
      {
        titulo: "Editar un cliente",
        parrafos: [
          "Para editar un cliente, buscalo en la lista de Clientes, hacé click en el botón de editar, modificá lo que necesites y hacé click en \"Guardar cambios\".",
        ],
      },
      {
        titulo: "Consultar cuenta corriente",
        parrafos: [
          "Para ver cuánto debe un cliente y su historial de movimientos:",
        ],
        pasos: [
          { texto: "Andá a la sección de cuentas corrientes o consultá desde Reportes." },
          { texto: "Buscá el cliente por nombre." },
          { texto: "Vas a ver el saldo actual (lo que debe) y el historial de movimientos: ventas que le hiciste y cobros que te pagó." },
        ],
      },
    ],
  },
  {
    numero: 9,
    titulo: "Proveedores",
    secciones: [
      {
        titulo: "Agregar un proveedor",
        parrafos: [
          "Para registrar compras, primero tenés que cargar al proveedor.",
        ],
        pasos: [
          { texto: "Hacé click en \"Proveedores\" en el menú." },
          { texto: "Hacé click en \"Nuevo proveedor\"." },
          { texto: "Completá \"Nombre / Razón Social\", \"Tipo de documento\", \"Número de documento\" y \"Condición IVA\"." },
          { texto: "Completá los datos de contacto opcionales (teléfono, email, dirección)." },
          { texto: "Hacé click en \"Crear proveedor\"." },
        ],
      },
      {
        titulo: "Editar un proveedor",
        parrafos: [
          "Para editar un proveedor, buscalo en la lista, hacé click en editar, modificá lo que necesites y guardá los cambios.",
        ],
      },
    ],
  },
  {
    numero: 10,
    titulo: "Stock",
    secciones: [
      {
        titulo: "Consultar stock",
        parrafos: [
          "Para ver cuánto tenés de cada producto:",
        ],
        pasos: [
          { texto: "Hacé click en \"Stock\" en el menú." },
          { texto: "Vas a ver la lista de todos los productos con su stock actual." },
          { texto: "Cada producto tiene un estado: \"OK\" (verde), \"Bajo mínimo\" (amarillo) o \"Sin stock\" (rojo)." },
          { texto: "Podés filtrar por categoría o buscar un producto específico." },
          { texto: "Si querés un PDF del stock, hacé click en \"Exportar PDF\"." },
        ],
      },
      {
        titulo: "El stock se actualiza solo",
        parrafos: [
          "No necesitás actualizar el stock manualmente. El sistema lo hace automáticamente cuando registrás una venta (baja el stock) o una compra (sube el stock).",
          "Si necesitás hacer un ajuste manual (por ejemplo, por mercadería rota o un error de conteo), podés hacerlo desde los ajustes de stock.",
        ],
      },
    ],
  },
  {
    numero: 11,
    titulo: "Reportes",
    secciones: [
      {
        titulo: "Ver reportes",
        parrafos: [
          "Los reportes te dan un resumen de cómo va el negocio. Hacé click en \"Reportes\" en el menú.",
          "Vas a ver tarjetas de acceso rápido: Caja diaria, CTA CTE (cuentas corrientes), Clientes, Proveedores, Stock diario y Stock resumido.",
        ],
      },
      {
        titulo: "Reporte de caja",
        parrafos: [
          "El reporte de caja muestra todos los movimientos del día: ingresos, egresos, debe y haber. Te sirve para ver cuánto entró y cuánto salió.",
        ],
      },
      {
        titulo: "Reporte de stock diario",
        parrafos: [
          "Muestra los movimientos de stock del día por producto: cuánto entró (compras) y cuánto salió (ventas). Útil para comparar con el conteo físico.",
        ],
      },
      {
        titulo: "Reporte de stock resumido",
        parrafos: [
          "Muestra el total de ingresos y egresos por producto en un período. También ves el valor total del stock valorizado (cuánto vale toda la mercadería).",
        ],
      },
      {
        titulo: "Información general",
        parrafos: [
          "La pantalla de Reportes también muestra información útil: el valor total del stock, cuántos productos tienen stock, cuántos están bajo el mínimo, cuántos están sin stock, y un resumen de compras por mes y por proveedor.",
        ],
      },
    ],
  },
  {
    numero: 12,
    titulo: "Configuración",
    secciones: [
      {
        titulo: "Parámetros del negocio",
        parrafos: [
          "Los parámetros del negocio son los datos de tu puesto que aparecen en los remitos y facturas. Solo el administrador puede cambiarlos.",
        ],
        pasos: [
          { texto: "Hacé click en \"Parámetros\" en el menú (solo visible para administradores)." },
          { texto: "Completá o modificá: \"Nombre de fantasía\" (como se llama tu puesto), \"Razón social\" (nombre legal), \"CUIT\", \"Condición IVA\"." },
          { texto: "Completá la dirección, localidad, teléfono y email." },
          { texto: "Hacé click en \"Guardar parámetros\"." },
        ],
      },
      {
        titulo: "Numeración de comprobantes",
        parrafos: [
          "Si necesitás corregir la numeración de remitos o facturas (por ejemplo, porque hubo un error), podés hacerlo desde la sección \"Numeración de comprobantes\" en la misma página de Parámetros.",
          "Ahí podés cambiar el punto de venta y el próximo número de remito, factura A, factura B y factura C. Solo usá esto si sabés lo que estás haciendo o te lo indicó el administrador.",
        ],
      },
    ],
  },
```

- [ ] **Step 2: Verify all 12 chapters compile**

Run: `npx tsx --eval "import { capitulos } from './scripts/manual/content'; console.log('OK:', capitulos.length, 'capitulos'); capitulos.forEach(c => console.log('  Cap', c.numero + ':', c.titulo, '-', c.secciones.length, 'secciones'))"`

Expected:
```
OK: 12 capitulos
  Cap 1: Primeros pasos - 3 secciones
  Cap 2: Caja diaria - 4 secciones
  Cap 3: Ventas - 3 secciones
  Cap 4: Cobros - 1 secciones
  Cap 5: Compras - 2 secciones
  Cap 6: Pagos a proveedores - 1 secciones
  Cap 7: Productos - 5 secciones
  Cap 8: Clientes - 3 secciones
  Cap 9: Proveedores - 2 secciones
  Cap 10: Stock - 2 secciones
  Cap 11: Reportes - 5 secciones
  Cap 12: Configuración - 2 secciones
```

- [ ] **Step 3: Commit**

```bash
git add scripts/manual/content.ts
git commit -m "feat(manual): content chapters 7-12 — management and configuration"
```

---

### Task 3: PDF component

**Files:**
- Create: `scripts/manual/pdf.tsx`

- [ ] **Step 1: Create PDF component with typography helpers**

```tsx
// scripts/manual/pdf.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Capitulo } from "./content";

const s = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitulo: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  coverSubtitulo: {
    fontSize: 18,
    color: "#475569",
    marginBottom: 8,
  },
  coverFecha: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 40,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
  h1: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  parrafo: {
    marginBottom: 8,
  },
  pasoContainer: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 8,
  },
  pasoNumero: {
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    width: 24,
    flexShrink: 0,
  },
  pasoTexto: {
    flex: 1,
  },
  indiceTitulo: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  indiceItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  indiceNumero: {
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    width: 30,
  },
  indiceTituloText: {
    flex: 1,
    fontSize: 12,
  },
});

interface Props {
  capitulos: Capitulo[];
  fecha: string;
}

export function ManualPDF({ capitulos, fecha }: Props) {
  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverTitulo}>Mercofrut</Text>
        <Text style={s.coverSubtitulo}>Manual de Usuario</Text>
        <Text style={s.coverFecha}>Generado el {fecha}</Text>
      </Page>

      {/* Table of contents */}
      <Page size="A4" style={s.page}>
        <Text style={s.indiceTitulo}>Contenido</Text>
        {capitulos.map((cap) => (
          <View key={cap.numero} style={s.indiceItem}>
            <Text style={s.indiceNumero}>{cap.numero}.</Text>
            <Text style={s.indiceTituloText}>{cap.titulo}</Text>
          </View>
        ))}
        <Text
          style={s.footer}
          render={({ pageNumber }) => `${pageNumber}`}
          fixed
        />
      </Page>

      {/* Chapters */}
      {capitulos.map((cap) => (
        <Page key={cap.numero} size="A4" style={s.page} wrap>
          <Text style={s.header} fixed>
            Manual de Usuario — Mercofrut
          </Text>
          <Text
            style={s.footer}
            render={({ pageNumber }) => `${pageNumber}`}
            fixed
          />

          <Text style={s.h1}>
            {cap.numero}. {cap.titulo}
          </Text>

          {cap.secciones.map((sec, si) => (
            <View key={si} wrap={false}>
              <Text style={s.h2}>{sec.titulo}</Text>
              {sec.parrafos.map((p, pi) => (
                <Text key={pi} style={s.parrafo}>
                  {p}
                </Text>
              ))}
              {sec.pasos?.map((paso, pi) => (
                <View key={pi} style={s.pasoContainer}>
                  <Text style={s.pasoNumero}>{pi + 1}.</Text>
                  <Text style={s.pasoTexto}>{paso.texto}</Text>
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsx --eval "import { ManualPDF } from './scripts/manual/pdf'; console.log('OK: ManualPDF imported')"`

Expected: `OK: ManualPDF imported`

- [ ] **Step 3: Commit**

```bash
git add scripts/manual/pdf.tsx
git commit -m "feat(manual): React-PDF component with cover, TOC, chapters, header/footer"
```

---

### Task 4: Orchestrator and npm script

**Files:**
- Create: `scripts/generate-manual.tsx`
- Modify: `package.json` — add "manual" script
- Modify: `.gitignore` — add manual PDF pattern

- [ ] **Step 1: Create orchestrator**

```tsx
// scripts/generate-manual.tsx
import { writeFileSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { capitulos } from "./manual/content";
import { ManualPDF } from "./manual/pdf";

async function main() {
  console.log("\n=== Generando Manual de Usuario ===\n");
  console.log(`Capítulos: ${capitulos.length}`);

  const fecha = format(new Date(), "dd/MM/yyyy", { locale: es });

  const buffer = await renderToBuffer(
    <ManualPDF capitulos={capitulos} fecha={fecha} />
  );

  const filename = "manual-usuario-mercofrut.pdf";
  writeFileSync(filename, new Uint8Array(buffer));

  console.log(`\nPDF generado: ${filename}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Add to `package.json` scripts:
```json
"manual": "tsx scripts/generate-manual.tsx"
```

- [ ] **Step 3: Add gitignore entry**

Add to `.gitignore`:
```
manual-usuario-mercofrut.pdf
```

- [ ] **Step 4: Add docs to README**

Add to `scripts/README.md` at the end:

```markdown
## Manual de usuario

### Uso

```bash
npm run manual
```

Genera `manual-usuario-mercofrut.pdf` en el directorio actual. El PDF tiene 12 capítulos que cubren todo el sistema: login, caja, ventas, cobros, compras, pagos, productos, clientes, proveedores, stock, reportes y configuración.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-manual.tsx package.json .gitignore scripts/README.md
git commit -m "feat(manual): orchestrator script + npm run manual + docs"
```
