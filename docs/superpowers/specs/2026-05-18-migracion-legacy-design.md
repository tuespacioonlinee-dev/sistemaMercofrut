# Migración Legacy — Spec de Diseño

## Resumen

Script CLI que importa datos maestros (productos, clientes, proveedores) desde archivos Excel o CSV del sistema legacy del cliente hacia la nueva DB de Mercofrut. Usa IA (Claude API) para mapear automáticamente las columnas del archivo origen a los campos del schema destino, sin importar cómo se llamen las columnas originales.

## Decisiones

| Decisión | Elección | Alternativas descartadas |
|----------|----------|--------------------------|
| Formato de entrada | Excel (.xlsx) y CSV (.csv) | Solo Excel, solo CSV |
| Mapeo de columnas | IA (Claude API) analiza headers + sample | Columnas fijas predefinidas, JSON de mapeo manual |
| Alcance de datos | Datos maestros: productos, clientes, proveedores + saldos CC | Histórico completo (ventas, compras, movimientos) |
| Cuándo se corre | Post-onboarding (DB ya creada con tablas) | Cualquier DB |
| Filas inválidas | Se saltan y se reportan al final | Frenar toda la importación |

## Prerrequisitos

1. DB del cliente ya creada via onboarding (tablas existentes, usuario admin creado)
2. Archivos de datos del cliente en formato `.xlsx` o `.csv`
3. Env var `ANTHROPIC_API_KEY` para las llamadas a Claude

## Uso

```bash
npx tsx scripts/migrate-legacy.ts \
  --target="postgresql://user:pass@host/db" \
  --productos="datos/listado-articulos.xlsx" \
  --clientes="datos/mis-clientes.csv" \
  --proveedores="datos/proveedores-2024.xlsx"
```

### Argumentos

| Argumento | Requerido | Descripción |
|-----------|-----------|-------------|
| `--target` | Sí | Connection string de la DB destino |
| `--productos` | No | Archivo Excel o CSV con productos |
| `--clientes` | No | Archivo Excel o CSV con clientes |
| `--proveedores` | No | Archivo Excel o CSV con proveedores |

Al menos uno de `--productos`, `--clientes` o `--proveedores` debe estar presente.

## Flujo del script

```
migrate-legacy.ts

1. Validar argumentos
   - --target presente
   - Al menos un archivo especificado
   - Los archivos existen y son .xlsx o .csv

2. Para cada archivo:
   a. Leer archivo (xlsx o csv)
   b. Extraer headers y primeras 5 filas de ejemplo
   c. Llamar a Claude API con:
      - Headers + sample del archivo
      - Schema esperado para esa entidad (campos, tipos, requeridos)
      - Pedir mapeo JSON: { "columna_origen" → "campo_destino" }
   d. Mostrar mapeo propuesto en tabla legible
   e. Mostrar columnas sin mapear y campos requeridos faltantes
   f. Si falta un campo requerido → error, no se puede importar ese archivo

3. Pedir confirmación interactiva: "¿Confirmar importación? (S/N)"
   - Si N → termina sin tocar la DB

4. Importar en orden (por dependencias FK):
   a. Categorías — extraídas de la columna mapeada a "categoria" en productos
   b. Unidades de medida — extraídas de la columna mapeada a "unidad" en productos
   c. Productos — con FK a categoría y unidad creadas
   d. Clientes — con creación automática de Cuenta si hay saldoInicial
   e. Proveedores — con creación automática de Cuenta si hay saldoInicial

5. Reportar resultado:
   - Conteo de registros importados por entidad
   - Filas saltadas con motivo (fila X: precioVenta no es número)
```

## Schema esperado por entidad

### Productos

| Campo destino | Requerido | Tipo | Default | Notas |
|---------------|-----------|------|---------|-------|
| codigo | Sí | string | — | Debe ser único |
| nombre | Sí | string | — | |
| categoria | Sí | string | — | Nombre de la categoría, se crea si no existe |
| unidad | Sí | string | — | Abreviatura de la unidad (Kg, Un, Cj), se crea si no existe |
| precioVenta | Sí | número | — | |
| precioCompra | No | número | 0 | |
| stockInicial | No | número | 0 | Si > 0, crea MovimientoStock tipo AJUSTE_POSITIVO |
| stockMinimo | No | número | 0 | |

### Clientes

| Campo destino | Requerido | Tipo | Default | Notas |
|---------------|-----------|------|---------|-------|
| nombreRazonSocial | Sí | string | — | |
| documento | Sí | string | — | Debe ser único |
| tipoDocumento | No | enum | DNI | CUIT, CUIL, DNI, PASAPORTE, OTRO |
| condicionIva | No | enum | CONSUMIDOR_FINAL | RESPONSABLE_INSCRIPTO, MONOTRIBUTO, EXENTO, CONSUMIDOR_FINAL, NO_RESPONSABLE |
| direccion | No | string | — | |
| localidad | No | string | — | |
| provincia | No | string | — | |
| telefono | No | string | — | |
| email | No | string | — | |
| maxCredito | No | número | — | |
| saldoInicial | No | número | 0 | Si != 0, crea Cuenta CORRIENTE con ese saldo |

### Proveedores

| Campo destino | Requerido | Tipo | Default | Notas |
|---------------|-----------|------|---------|-------|
| nombreRazonSocial | Sí | string | — | |
| documento | Sí | string | — | Debe ser único |
| tipoDocumento | No | enum | CUIT | |
| condicionIva | No | enum | RESPONSABLE_INSCRIPTO | |
| direccion | No | string | — | |
| localidad | No | string | — | |
| provincia | No | string | — | |
| telefono | No | string | — | |
| email | No | string | — | |
| saldoInicial | No | número | 0 | Si != 0, crea Cuenta CORRIENTE con ese saldo |

## Mapeo por IA — Prompt a Claude

El mapper envía a Claude (modelo haiku, barato y rápido):

- Los headers del archivo
- 5 filas de ejemplo
- La lista de campos destino con descripción y tipo
- Instrucción: devolver JSON con el mapeo `{ "header_origen": "campo_destino" }` y un array de headers sin mapear

La respuesta se parsea como JSON. Si Claude no puede mapear un campo requerido, el script lo reporta y no importa ese archivo.

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrate-legacy.ts` | Orquestador principal |
| `scripts/migrate/args.ts` | Parseo y validación de argumentos CLI |
| `scripts/migrate/reader.ts` | Lee archivos .xlsx y .csv, devuelve headers + filas |
| `scripts/migrate/mapper.ts` | Llama a Claude API para mapear columnas |
| `scripts/migrate/validator.ts` | Valida datos mapeados (tipos, requeridos, enums) |
| `scripts/migrate/importer.ts` | Inserta datos en la DB (categorías → unidades → productos → clientes → proveedores) |

## Env vars del script

| Env var | Descripción |
|---------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic para llamadas a Claude |

## Dependencias nuevas

| Paquete | Propósito |
|---------|-----------|
| `xlsx` | Leer archivos .xlsx |
| `@anthropic-ai/sdk` | Llamar a Claude API para mapeo de columnas |

El paquete `xlsx` (SheetJS) lee tanto `.xlsx` como `.csv`, así que no se necesita paquete extra para CSV.

## Manejo de errores

- **Archivo no existe o formato inválido:** error, termina sin tocar la DB
- **Claude API falla:** error, termina sin tocar la DB
- **Campo requerido sin mapeo:** error para ese archivo, los demás archivos pueden continuar
- **Fila con datos inválidos:** se salta esa fila, se reporta al final (fila X: motivo)
- **Duplicado en DB:** se salta (ej: producto con mismo código ya existe), se reporta
- **Error de DB durante importación:** se detiene e imprime cuánto se importó hasta ese punto

## Lógica de importación por entidad

### Categorías (auto-extraídas de productos)
1. Leer valores únicos de la columna mapeada a "categoria"
2. Para cada valor: buscar si existe por nombre, si no → crear

### Unidades de medida (auto-extraídas de productos)
1. Leer valores únicos de la columna mapeada a "unidad"
2. Para cada valor: buscar si existe por abreviatura, si no → crear con nombre = abreviatura

### Productos
1. Para cada fila válida:
   - Buscar categoría por nombre (ya creada en paso anterior)
   - Buscar unidad por abreviatura (ya creada en paso anterior)
   - Crear Producto con todos los campos mapeados
   - Si stockInicial > 0: actualizar stockTotal y crear MovimientoStock AJUSTE_POSITIVO

### Clientes
1. Para cada fila válida:
   - Crear Cliente
   - Si saldoInicial != 0: crear Cuenta tipo CORRIENTE, titular CLIENTE, con ese saldo

### Proveedores
1. Para cada fila válida:
   - Crear Proveedor
   - Si saldoInicial != 0: crear Cuenta tipo CORRIENTE, titular PROVEEDOR, con ese saldo

## Output de ejemplo

```
=== Migración Legacy ===

Archivo: listado-articulos.xlsx (productos)
  Filas encontradas: 142

  Mapeo propuesto por IA:
  ┌──────────────────┬──────────────────┐
  │ Columna origen   │ Campo destino    │
  ├──────────────────┼──────────────────┤
  │ Codigo Art.      │ codigo           │
  │ Descripcion      │ nombre           │
  │ Rubro            │ categoria        │
  │ Unid.            │ unidad           │
  │ Precio Lista     │ precioVenta      │
  │ Costo            │ precioCompra     │
  │ Stock Actual     │ stockInicial     │
  └──────────────────┴──────────────────┘
  Sin mapear: "Cod. Barra" (no tiene campo destino)

Archivo: mis-clientes.csv (clientes)
  Filas encontradas: 38

  Mapeo propuesto por IA:
  ┌──────────────────┬──────────────────────┐
  │ Columna origen   │ Campo destino        │
  ├──────────────────┼──────────────────────┤
  │ Nombre           │ nombreRazonSocial    │
  │ DNI/CUIT         │ documento            │
  │ Tipo Doc         │ tipoDocumento        │
  │ IVA              │ condicionIva         │
  │ Domicilio        │ direccion            │
  │ Tel              │ telefono             │
  │ Saldo            │ saldoInicial         │
  └──────────────────┴──────────────────────┘

¿Confirmar importación? (S/N): S

Importando productos...
  8 categorías creadas
  3 unidades de medida creadas
  139 productos importados
  3 saltados:
    Fila 45: precioVenta vacío
    Fila 89: codigo duplicado "PRD-012"
    Fila 130: nombre vacío

Importando clientes...
  38 clientes importados (0 saltados)
  12 cuentas corrientes creadas (con saldo inicial)

=== Migración completada ===
  Productos: 139/142
  Clientes: 38/38
```
