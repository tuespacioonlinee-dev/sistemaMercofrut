# Validacion Paralelo — Spec de Diseno

## Resumen

Script CLI que genera un PDF de cierre diario para validar la corrida en paralelo entre el sistema viejo del cliente y Mercofrut. El operador lo corre contra la DB del cliente, genera el PDF, y el cliente compara manualmente contra los numeros de su sistema viejo.

## Decisiones

| Decision | Eleccion | Alternativas descartadas |
|----------|----------|--------------------------|
| Formato de salida | PDF | Terminal (poco profesional), Excel (innecesario) |
| Donde corre | Script CLI (`npm run validate`) | Pagina en la app (el cliente no sabe usar la app durante paralelo) |
| Libreria PDF | `@react-pdf/renderer` (renderToBuffer) | jsPDF, pdfkit (agregan dependencia nueva) |
| Conexion DB | PrismaClient con --target | API routes (requiere app corriendo) |

## Uso

```bash
npm run validate -- --target="postgresql://user:pass@host/db" --fecha="2026-05-18"
```

- `--target` (obligatorio): connection string de la DB del cliente
- `--fecha` (opcional): fecha del reporte, formato YYYY-MM-DD. Default: hoy

Genera: `cierre-diario-YYYY-MM-DD.pdf` en el directorio actual.

## Secciones del reporte

### 1. Caja diaria

- Saldo inicial de la caja del dia
- Movimientos agrupados por categoria: VENTA_CONTADO, COBRO_CLIENTE, PAGO_PROVEEDOR, COMPRA_CONTADO, GASTO, RETIRO, DEPOSITO, OTRO
- Total ingresos, total egresos
- Saldo final
- Monto de arqueo (si la caja fue cerrada)
- Si no hubo caja abierta ese dia, mostrar "Sin caja registrada"

### 2. Ventas del dia

- Listado de ventas: numero, cliente, condicion (CONTADO/CUENTA_CORRIENTE), total
- Subtotal ventas contado
- Subtotal ventas cuenta corriente
- Total general del dia
- Si no hubo ventas, mostrar "Sin ventas registradas"

### 3. Stock con movimiento

- Solo productos que tuvieron MovimientoStock en la fecha
- Columnas: codigo, producto, stock anterior, ingresos, egresos, stock actual
- Stock anterior se calcula: stockTotal actual - (ingresos - egresos del dia)
- Si no hubo movimientos de stock, mostrar "Sin movimientos de stock"

### 4. Saldos cuenta corriente

- Solo clientes con cuenta CORRIENTE que tuvieron MovimientoCuenta en la fecha
- Columnas: cliente, saldo anterior, debitos (ventas CC), creditos (cobros), saldo actual
- Saldo anterior se calcula: saldo actual - (debitos - creditos del dia)
- Si no hubo movimientos CC, mostrar "Sin movimientos de cuenta corriente"

## Archivos nuevos

| Archivo | Proposito |
|---------|-----------|
| `scripts/validate/args.ts` | Parseo y validacion de argumentos CLI (--target, --fecha) |
| `scripts/validate/queries.ts` | 4 funciones de consulta Prisma: caja, ventas, stock, saldos CC |
| `scripts/validate/pdf.tsx` | Componente React-PDF `<CierreDiarioPDF>` con las 4 secciones |
| `scripts/validate-daily.ts` | Orquestador: parsea args, conecta DB, consulta, genera PDF, escribe archivo |

## Detalles tecnicos

### args.ts

- Parsea `--target` y `--fecha` de `process.argv`
- Valida que target sea un string no vacio
- Valida que fecha sea formato YYYY-MM-DD valido (si se proporciona)
- Default de fecha: hoy (`new Date()`)
- Exporta `parseArgs()` que retorna `{ target: string, fecha: Date }`

### queries.ts

Cada funcion recibe un `PrismaClient` y una `Date`, retorna datos tipados.

**`getCajaData(prisma, fecha)`**
- Busca CajaDiaria donde `fechaApertura` es la fecha dada
- Trae sus MovimientoCaja agrupados por `categoria`
- Retorna: `{ saldoInicial, movimientos: { categoria, total }[], totalIngresos, totalEgresos, saldoFinal, saldoArqueo, estado }`

**`getVentasData(prisma, fecha)`**
- Busca Venta con `createdAt` en el rango del dia, estado CONFIRMADA
- Incluye cliente y detalles
- Retorna: `{ ventas: { numero, cliente, condicion, total }[], subtotalContado, subtotalCC, totalGeneral }`

**`getStockData(prisma, fecha)`**
- Busca MovimientoStock con `createdAt` en el rango del dia
- Agrupa por producto, suma ingresos (tipos positivos) y egresos (tipos negativos)
- Calcula stock anterior: stockTotal actual - netMovimientoDelDia
- Retorna: `{ items: { codigo, nombre, stockAnterior, ingresos, egresos, stockActual }[] }`

**`getSaldosCCData(prisma, fecha)`**
- Busca MovimientoCuenta con `createdAt` en el rango del dia, para cuentas tipo CORRIENTE con titular CLIENTE
- Agrupa por cuenta/cliente, suma debitos y creditos
- Calcula saldo anterior: saldo actual - (debitos - creditos del dia)
- Retorna: `{ items: { cliente, saldoAnterior, debitos, creditos, saldoActual }[] }`

### pdf.tsx

Componente React-PDF `<CierreDiarioPDF>` que recibe las 4 estructuras de datos.

- Header: nombre del negocio (de ParametrosNegocio), "Reporte de Cierre Diario", fecha
- 4 secciones con tablas simples, bordes grises, header de tabla con fondo gris claro
- Numeros formateados con separador de miles (1.500,00) usando locale AR
- Sigue el estilo visual de los PDF existentes (StockPDF, ComprasPDF)

### validate-daily.ts

Orquestador:
1. `parseArgs()` — obtiene target y fecha
2. Crea PrismaClient con target como datasource URL
3. Consulta ParametrosNegocio para nombre del negocio
4. Ejecuta las 4 queries en paralelo con `Promise.all`
5. Renderiza `<CierreDiarioPDF>` con `renderToBuffer`
6. Escribe el buffer a `cierre-diario-YYYY-MM-DD.pdf`
7. Imprime resumen en consola y path del archivo
8. Desconecta Prisma

## npm script

```json
"validate": "tsx scripts/validate-daily.ts"
```

## Dependencias nuevas

Ninguna. Usa `@react-pdf/renderer`, `@prisma/client`, y `date-fns` que ya estan instalados.

## Consideraciones

- El script se conecta a la DB del cliente directamente, no pasa por la app
- Cada consulta filtra por fecha usando rango: `>= startOfDay(fecha)` y `< startOfDay(fecha + 1)`
- Los montos en Prisma son `Decimal`, se convierten a `number` para el PDF
- Si la DB no tiene datos para ese dia, cada seccion muestra su mensaje vacio correspondiente
- El script no modifica datos, es solo lectura
