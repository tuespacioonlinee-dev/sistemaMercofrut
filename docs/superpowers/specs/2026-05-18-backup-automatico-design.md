# Backup Automatico — Spec de Diseno

## Resumen

Script de backup automatico diario para la base de datos de Mercofrut. Se ejecuta via GitHub Actions a las 3am (hora Argentina), genera un dump comprimido de PostgreSQL, lo sube a Google Drive, y notifica por email si algo falla. Incluye script de restore con verificacion.

## Decisiones

| Decision | Eleccion | Alternativas descartadas |
|----------|----------|--------------------------|
| Alcance | Solo Mercofrut (una instancia) | Multi-cliente (se generaliza en Bloque 2 onboarding) |
| Storage | Google Drive (Service Account) | AWS S3, GitHub artifact, PC local |
| Ejecucion | GitHub Actions cron | Script local, Neon branching |
| Alertas | Email via Resend | Solo GitHub notifications, WhatsApp |
| Retencion | 120 dias | 7, 30, 90 dias |

## Arquitectura

```
GitHub Actions (cron: 3am ART, diario)
  1. pg_dump -> Neon (DIRECT_URL)
  2. gzip -> mercofrut-YYYY-MM-DD-HHmmss.sql.gz
  3. Upload -> Google Drive (carpeta backups)
  4. Cleanup -> borrar > 120 dias en Drive
  5. Si falla -> email via Resend
```

## Archivos nuevos

| Archivo | Proposito |
|---------|-----------|
| `scripts/backup.ts` | Logica del backup: dump, compress, upload, cleanup, notify |
| `scripts/restore.ts` | Descarga de Drive + restore con psql + verificacion |
| `.github/workflows/backup.yml` | Workflow de GitHub Actions con cron diario |

No se modifica ningun archivo existente de la app.

## Secrets de GitHub requeridos

| Secret | Descripcion |
|--------|-------------|
| `DIRECT_URL` | Connection string directo de Neon (sin pooler) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Clave JSON del Service Account de Google |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta de Drive donde van los backups |
| `RESEND_API_KEY` | API key de Resend para enviar emails de error |
| `ALERT_EMAIL` | Direccion de email donde llegan las alertas |

## Flujo de backup.ts

```
main()
+-- 1. pgDump()
|     Ejecuta: pg_dump $DIRECT_URL --format=plain --no-owner --no-acl
|     Pipe directo a gzip -> archivo temporal mercofrut-YYYY-MM-DD-HHmmss.sql.gz
|
+-- 2. uploadToDrive()
|     Usa googleapis SDK con Service Account
|     Sube el .sql.gz a la carpeta configurada
|     Devuelve el file ID de Drive
|
+-- 3. cleanupOldBackups()
|     Lista archivos en la carpeta de Drive
|     Borra los que tengan mas de 120 dias (por fecha en el nombre del archivo)
|
+-- 4. Si cualquier paso falla -> notifyError()
       Manda email via Resend: que paso fallo, mensaje de error, timestamp
       Si hasta el email falla -> workflow queda en rojo (GitHub notifica nativo)
```

## Flujo de restore.ts

```
scripts/restore.ts <archivo-o-fecha>

+-- 1. Resolver el backup
|     Si es fecha ("2026-05-18") -> busca en Drive el archivo de ese dia
|     Si es ruta local ("./backup.sql.gz") -> usa ese archivo
|
+-- 2. Descargar de Drive (si aplica)
|     Baja el .sql.gz a /tmp/
|
+-- 3. Restaurar
|     gunzip -> psql contra la URL pasada como argumento
|     NUNCA restaura contra produccion por default
|     Requiere flag explicito: --target=<connection_string>
|
+-- 4. Verificacion basica
       Queries de sanity check contra la DB restaurada:
       - Cuenta de registros en tablas principales (Producto, Cliente, Venta, etc.)
       - Verifica que el schema tenga todas las tablas esperadas
       - Imprime resumen: "245 productos, 89 clientes, 1203 ventas — restore OK"
```

## Dependencias nuevas (devDependencies)

| Paquete | Uso |
|---------|-----|
| `googleapis` | SDK de Google para subir/listar/borrar en Drive |
| `resend` | SDK para enviar emails de alerta |

## Workflow de GitHub Actions

- Nombre: `backup-diario`
- Cron: `0 6 * * *` (6:00 UTC = 3:00 ART)
- Runner: `ubuntu-latest`
- Instala PostgreSQL client (para pg_dump)
- Corre `tsx scripts/backup.ts`
- Naming del archivo: `mercofrut-YYYY-MM-DD-HHmmss.sql.gz`

## Seguridad

- El restore no tiene connection string por defecto — hay que pasarla explicitamente con `--target`
- La clave del Service Account viaja como secret de GitHub, nunca en el repo
- El dump viaja encriptado por SSL (Neon requiere sslmode=require)
- Los archivos en Drive son accesibles solo por el Service Account y quien tenga acceso a la carpeta

## Retencion

120 dias. El script de cleanup borra automaticamente los archivos mas viejos en cada ejecucion. El dueno puede descargar cualquier backup desde Google Drive en cualquier momento.
