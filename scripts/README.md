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
