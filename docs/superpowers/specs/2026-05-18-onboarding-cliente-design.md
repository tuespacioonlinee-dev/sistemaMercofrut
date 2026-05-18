# Onboarding de Cliente Nuevo — Spec de Diseno

## Resumen

Script CLI que automatiza el alta de un nuevo puesto/cliente del sistema Mercofrut. Cada puesto tiene su propia DB en Neon y su propio deploy en Vercel con subdominio custom. El script reduce el proceso de 2 horas manuales a 5 minutos automaticos.

## Decisiones

| Decision | Eleccion | Alternativas descartadas |
|----------|----------|--------------------------|
| Modelo multi-tenant | Instancia separada por puesto (DB + deploy propios) | DB compartida con filtro por tenant |
| URLs | Subdominios: puesto.mercofrut.com | URL de Vercel directa, web centralizada |
| Interfaz | Script CLI con argumentos | Script interactivo, dashboard web admin |
| Rollback si falla | Manual (el script reporta que creo) | Rollback automatico (mas complejo, mas riesgoso) |

## Prerrequisitos (una sola vez)

1. **Dominio `mercofrut.com`** comprado y apuntado a Vercel
2. **DNS wildcard:** `*.mercofrut.com` como CNAME a `cname.vercel-dns.com` — esto hace que cualquier subdominio nuevo funcione sin tocar DNS cada vez
3. **Tokens** como env vars del script (no del cliente):
   - `NEON_API_KEY` — API key de Neon
   - `VERCEL_TOKEN` — token de Vercel
   - `GITHUB_TOKEN` — token de GitHub (para vincular repo al proyecto Vercel)

## Uso

```bash
npx tsx scripts/onboard-client.ts \
  --nombre="Fruteria Don Pedro" \
  --cuit="20-12345678-9" \
  --condicionIva="MONOTRIBUTO" \
  --direccion="Puesto 42, Mercado Central" \
  --email="pedro@mail.com" \
  --password="pedrito2026" \
  --subdominio="donpedro"
```

### Argumentos

| Argumento | Requerido | Descripcion |
|-----------|-----------|-------------|
| `--nombre` | Si | Nombre de fantasia del negocio |
| `--cuit` | Si | CUIT del negocio (formato XX-XXXXXXXX-X) |
| `--condicionIva` | Si | RESPONSABLE_INSCRIPTO, MONOTRIBUTO, EXENTO, CONSUMIDOR_FINAL, NO_RESPONSABLE |
| `--direccion` | Si | Direccion del puesto |
| `--email` | Si | Email del usuario admin inicial |
| `--password` | Si | Password inicial del admin |
| `--subdominio` | Si | Subdominio para la URL (solo alfanumerico y guiones) |

## Flujo del script

```
onboard-client.ts

1. Validar argumentos
   - Todos los requeridos presentes
   - CUIT con formato valido
   - Subdominio: solo letras, numeros y guiones, sin espacios
   - condicionIva: valor valido del enum

2. Crear proyecto en Neon
   API: POST /projects
   Nombre: "mercofrut-{subdominio}"
   Region: aws-sa-east-1
   Resultado: connection strings (pooler + directa)

3. Correr migraciones
   Ejecuta: prisma migrate deploy
   Usando DIRECT_URL de la nueva DB
   Crea todas las tablas del schema actual

4. Seed con datos del cliente
   Inserta Usuario admin (email, password hasheado con bcrypt, rol ADMIN)
   Inserta ParametrosNegocio (nombre, CUIT, condicionIva, direccion)

5. Crear proyecto en Vercel
   API: POST /v10/projects
   Nombre: "mercofrut-{subdominio}"
   Vinculado al repo: tuespacioonlinee-dev/sistemaMercofrut
   Framework: nextjs

6. Configurar env vars en Vercel
   API: POST /v10/projects/{id}/env
   Variables:
   - DATABASE_URL = connection string pooler + params
   - DIRECT_URL = connection string directa + params
   - AUTH_SECRET = nuevo secreto random generado
   - AUTH_URL = https://{subdominio}.mercofrut.com

7. Agregar dominio custom en Vercel
   API: POST /v10/projects/{id}/domains
   Dominio: {subdominio}.mercofrut.com

8. Output
   Imprime:
   - URL del nuevo puesto
   - Credenciales de login (email + password)
   - IDs de los recursos creados (por si hay que limpiar)
```

## Archivos nuevos

| Archivo | Proposito |
|---------|-----------|
| `scripts/onboard-client.ts` | Orquestador principal |
| `scripts/onboard/args.ts` | Parseo y validacion de argumentos CLI |
| `scripts/onboard/neon.ts` | Crear proyecto en Neon via API |
| `scripts/onboard/migrate.ts` | Correr prisma migrate deploy contra una DB |
| `scripts/onboard/seed.ts` | Insertar usuario admin + parametros del negocio |
| `scripts/onboard/vercel.ts` | Crear proyecto en Vercel, env vars, dominio |

## Env vars del script

Estas van en el `.env` local de quien corre el script (Tomas), no del cliente:

| Env var | Descripcion |
|---------|-------------|
| `NEON_API_KEY` | API key de Neon para crear proyectos |
| `VERCEL_TOKEN` | Token de Vercel para crear proyectos |
| `GITHUB_TOKEN` | Token de GitHub para vincular repo |

## Manejo de errores

- Si falla en cualquier paso, el script se detiene e imprime:
  - Que paso fallo y el error
  - Lista de recursos ya creados (ej: "Proyecto Neon 'mercofrut-donpedro' creado — borrar manualmente si es necesario")
- NO hace rollback automatico: es mas seguro que el operador decida que limpiar
- Cada paso loguea lo que hace antes de hacerlo ("Creando proyecto en Neon...")

## Seguridad

- El password del admin se hashea con bcrypt antes de insertar (mismo patron que el seed actual)
- Los tokens del operador (NEON_API_KEY, VERCEL_TOKEN) nunca se pasan al proyecto del cliente
- Cada proyecto Vercel recibe su propio AUTH_SECRET generado random

## Output de ejemplo

```
=== Onboarding: Fruteria Don Pedro ===

1. Creando proyecto en Neon...
   Proyecto: mercofrut-donpedro (id: abc123)
   DB URL: postgresql://...@ep-xxx-pooler.sa-east-1.aws.neon.tech/neondb

2. Corriendo migraciones...
   21 tablas creadas

3. Creando usuario admin y parametros...
   Usuario: pedro@mail.com (ADMIN)
   Negocio: Fruteria Don Pedro (CUIT: 20-12345678-9)

4. Creando proyecto en Vercel...
   Proyecto: mercofrut-donpedro (id: prj_xxx)

5. Configurando env vars...
   4 variables configuradas

6. Configurando dominio...
   Dominio: donpedro.mercofrut.com

=== Onboarding completado ===

URL:   https://donpedro.mercofrut.com
Login: pedro@mail.com
Pass:  pedrito2026

Recursos creados:
  Neon project: abc123
  Vercel project: prj_xxx
```
