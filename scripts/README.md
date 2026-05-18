# Scripts de backup

## Setup inicial (una sola vez)

### 1. Google Cloud — Service Account

1. Ir a https://console.cloud.google.com/
2. Crear proyecto (o usar uno existente)
3. Habilitar "Google Drive API"
4. Ir a IAM > Service Accounts > Crear
5. Nombre: `mercofrut-backup`
6. Crear clave JSON > descargar
7. En Google Drive: crear carpeta "Backups Mercofrut"
8. Compartir esa carpeta con el email del Service Account (el que termina en @xxx.iam.gserviceaccount.com)
9. Copiar el ID de la carpeta (esta en la URL de Drive)

### 2. Resend — Email

1. Ir a https://resend.com/
2. Crear cuenta (free tier: 100 emails/dia)
3. Obtener API key desde el dashboard

### 3. GitHub Secrets

En el repo > Settings > Secrets and variables > Actions, agregar:

| Secret | Valor |
|--------|-------|
| `DIRECT_URL` | Connection string directo de Neon (sin pooler) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON del Service Account |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta de Drive |
| `RESEND_API_KEY` | API key de Resend |
| `ALERT_EMAIL` | Email donde llegan las alertas |

### 4. Test manual

Correr el workflow manualmente desde GitHub Actions (boton "Run workflow") y verificar que:
- El archivo aparece en la carpeta de Drive
- El log del workflow muestra "Backup completado OK"

## Comandos

```bash
# Backup manual
npm run backup

# Restore
npm run restore -- 2026-05-18 --target="postgresql://user:pass@host/db"
npm run restore -- ./archivo.sql.gz --target="postgresql://user:pass@host/db"
```

## Onboarding de cliente nuevo

### Prerrequisitos

1. Dominio `mercofrut.com` apuntado a Vercel
2. DNS wildcard: `*.mercofrut.com` como CNAME a `cname.vercel-dns.com`
3. Env vars en `.env`: `NEON_API_KEY`, `VERCEL_TOKEN`, `GITHUB_TOKEN`

### Uso

```bash
npm run onboard -- \
  --nombre="Fruteria Don Pedro" \
  --cuit="20-12345678-9" \
  --condicionIva="MONOTRIBUTO" \
  --direccion="Puesto 42, Mercado Central" \
  --email="pedro@mail.com" \
  --password="pedrito2026" \
  --subdominio="donpedro"
```

### Valores validos para condicionIva

RESPONSABLE_INSCRIPTO, MONOTRIBUTO, EXENTO, CONSUMIDOR_FINAL, NO_RESPONSABLE

## Validación de corrida en paralelo

### Uso

```bash
npm run validate -- \
  --target="postgresql://user:pass@host/db" \
  --fecha="2026-05-18"
```

### Argumentos

- `--target` (obligatorio): connection string de la DB del cliente
- `--fecha` (opcional): fecha del reporte en formato YYYY-MM-DD (default: hoy)

Genera un PDF `cierre-diario-YYYY-MM-DD.pdf` con 4 secciones:
1. Caja diaria (saldo inicial, movimientos por categoría, arqueo)
2. Ventas del día (listado con desglose contado vs CC)
3. Stock con movimiento (ingresos, egresos, stock anterior y actual)
4. Saldos cuenta corriente (débitos, créditos, saldo anterior y actual)

## Migración de datos legacy

### Prerrequisitos

1. DB del cliente ya creada via `npm run onboard`
2. Archivos de datos del cliente en formato `.xlsx` o `.csv`
3. Env var `ANTHROPIC_API_KEY` en `.env`

### Uso

```bash
npm run migrate-legacy -- \
  --target="postgresql://user:pass@host/db" \
  --productos="datos/productos.xlsx" \
  --clientes="datos/clientes.csv" \
  --proveedores="datos/proveedores.xlsx"
```

Los nombres de columnas en los archivos pueden ser cualquiera — la IA analiza los headers y propone un mapeo automáticamente. El operador confirma antes de importar.

### Argumentos

- `--target` (obligatorio): connection string de la DB del cliente
- `--productos`: archivo con productos (código, nombre, categoría, unidad, precios, stock)
- `--clientes`: archivo con clientes (nombre, documento, condición IVA, dirección, saldo)
- `--proveedores`: archivo con proveedores (nombre, documento, condición IVA, dirección, saldo)

Al menos uno de `--productos`, `--clientes` o `--proveedores` es obligatorio.

## Manual de usuario

### Uso

```bash
npm run manual
```

Genera `manual-usuario-mercofrut.pdf` en el directorio actual. El PDF tiene 12 capítulos que cubren todo el sistema: login, caja, ventas, cobros, compras, pagos, productos, clientes, proveedores, stock, reportes y configuración.
