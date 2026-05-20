# Onboarding de un cliente nuevo

Guía paso a paso para levantar una instancia del sistema para un puesto del
Mercofrut. **Tiempo estimado: 30-40 minutos** la primera vez, ~15 minutos
con experiencia.

> Esta guía asume arquitectura **single-tenant replicado**: una DB de Neon
> y un proyecto de Vercel por cliente, todos servidos desde el mismo repo
> de GitHub. Ver memoria del proyecto para fundamentos.

---

## 0. Prerrequisitos (una sola vez, no por cliente)

- Cuenta de **Neon** (plan Launch o superior — hasta 10 proyectos)
- Cuenta de **Vercel** (plan Pro recomendado — proyectos ilimitados)
- Dominio comprado (`jdc.com.ar` o similar) configurado en Vercel
- Repo `sistemaMercofrut` accesible desde la cuenta de Vercel
- Acceso al gestor de secretos compartido (Bitwarden / 1Password) para
  guardar las credenciales del cliente

---

## 1. Crear la base de datos en Neon

1. Entrar a [console.neon.tech](https://console.neon.tech)
2. **New Project** → nombre: `mercofrut-<nombre-corto-cliente>` (ej:
   `mercofrut-perez`)
3. Región: `aws-us-east-1` (la más cercana a Vercel US)
4. Postgres version: la más reciente
5. Una vez creado, ir a **Connection string** y copiar las DOS URLs:
   - **Pooled connection** → será `DATABASE_URL`
   - **Direct connection** → será `DIRECT_URL`
6. Activar **Autosuspend** a 5 minutos (importante para no consumir cómputo
   gratis cuando el puesto cierra)

---

## 2. Crear el proyecto en Vercel

1. Entrar a [vercel.com/new](https://vercel.com/new)
2. Importar el repo `sistemaMercofrut`
3. **Project Name**: `mercofrut-<nombre-cliente>` (es el subdominio
   `.vercel.app` por defecto, después agregamos dominio propio)
4. **Framework Preset**: Next.js (autodetectado)
5. NO hacer deploy todavía — primero hay que cargar las env vars

---

## 3. Configurar variables de entorno

En **Project Settings → Environment Variables** del nuevo proyecto Vercel,
agregar las siguientes. Marcar todas para los 3 environments (Production,
Preview, Development) salvo donde se indique lo contrario.

### Base de datos (de Neon, paso 1)

| Variable        | Valor                                       |
|-----------------|---------------------------------------------|
| `DATABASE_URL`  | Pooled connection con `?connection_limit=5` |
| `DIRECT_URL`    | Direct connection                            |

### Auth

| Variable           | Cómo generarlo                                    |
|--------------------|---------------------------------------------------|
| `AUTH_SECRET`      | `openssl rand -base64 32`                         |
| `AUTH_URL`         | URL final del cliente (ver paso 5)                |
| `KEEPALIVE_SECRET` | `openssl rand -hex 16`                            |

### Datos del negocio (los del cliente real)

| Variable                      | Ejemplo                              |
|-------------------------------|--------------------------------------|
| `NEXT_PUBLIC_NEGOCIO_NOMBRE`  | `"Distribuidora Pérez"`              |
| `NEGOCIO_RAZON_SOCIAL`        | `"Pérez Juan SA"`                    |
| `NEGOCIO_CUIT`                | `"30-12345678-9"`                    |
| `NEGOCIO_CONDICION_IVA`       | `"RESPONSABLE_INSCRIPTO"`            |
| `NEGOCIO_DIRECCION`           | `"Av. Roca 1234"`                    |
| `NEGOCIO_LOCALIDAD`           | `"S.M. de Tucumán"`                  |
| `NEGOCIO_TELEFONO`            | `"+54 381 xxx-xxxx"`                 |
| `NEGOCIO_INGRESOS_BRUTOS`     | (opcional)                           |
| `NEGOCIO_PUNTO_VENTA`         | `"1"` (por defecto)                  |

### Seed del admin inicial (solo para el primer deploy)

> Estas variables se borran después del primer login. El admin queda en la
> base.

| Variable               | Ejemplo                                |
|------------------------|----------------------------------------|
| `SEED_ADMIN_EMAIL`     | `"perez@miempresa.com"`                |
| `SEED_ADMIN_PASSWORD`  | Generar con `openssl rand -base64 12`  |
| `SEED_ADMIN_NOMBRE`    | `"Juan Pérez"`                         |

### API key de Anthropic (compartida entre clientes)

| Variable            | Valor                            |
|---------------------|----------------------------------|
| `ANTHROPIC_API_KEY` | La key compartida del workspace  |

---

## 4. Correr migraciones y seed

Hay dos formas: desde tu máquina (más controlada) o usando el primer build
de Vercel (más automático pero menos visible).

### Opción A: desde tu máquina (RECOMENDADO la primera vez)

```bash
# 1. Crear archivo .env.cliente con TODAS las env vars del paso 3
#    (DATABASE_URL, DIRECT_URL, NEGOCIO_*, SEED_ADMIN_*)
#    El archivo NO se commitea (ya está en .gitignore como .env*)

# 2. Aplicar migraciones + seed en un solo comando
npm run onboard:client

# 3. Borrar el .env.cliente (¡tiene credenciales!)
rm .env.cliente
```

> El script `onboard:client` corre `prisma migrate deploy && npm run seed`
> usando `.env.cliente` como fuente de variables. Si preferís correrlos
> por separado: `npx dotenv -e .env.cliente -- npx prisma migrate deploy`
> y luego `npx dotenv -e .env.cliente -- npm run seed`.

El seed crea:

- 1 usuario admin con las credenciales de `SEED_ADMIN_*`
- ParametrosNegocio con los datos del cliente
- ParametrosComprobante (numeración en 1)
- 4 unidades de medida base (kg, un, bolsa, cajón)
- 1 categoría "General"

### Opción B: build de Vercel hace todo

Asegurarse de que el `build` corra migraciones antes de buildear. Editar
en `package.json`:

```json
"build": "prisma migrate deploy && prisma generate && next build"
```

Y agregar un `vercel-build` script que también corra el seed (o disparar
el seed manualmente vía una página `/api/seed` protegida con un secret).

> Esta opción es más automática pero el seed no es trivial de disparar en
> el build. Por ahora, **usar la opción A**.

---

## 5. Configurar el dominio

1. En Vercel, **Settings → Domains** del proyecto
2. Agregar `<cliente>.jdc.com.ar` (subdominio del dominio principal)
3. Vercel te da el CNAME para agregar al DNS de `jdc.com.ar` (lo hacés
   una vez en NIC.ar)
4. Actualizar la env var `AUTH_URL` al dominio final (sin trailing slash)
5. Hacer un **Redeploy** para que tome la nueva `AUTH_URL`

---

## 6. Smoke test (validación post-deploy)

Entrar a la URL del cliente y verificar:

- [ ] `/login` muestra el nombre del cliente (no "Mi Empresa")
- [ ] Login con las credenciales del admin funciona
- [ ] El sidebar muestra el nombre del cliente arriba a la izquierda
- [ ] `/parametros` muestra los datos cargados — corregir lo que esté mal
      desde acá (el CUIT real, dirección exacta, etc.)
- [ ] Crear un cliente de prueba
- [ ] Crear un producto de prueba en la categoría "General"
- [ ] Cargar una venta de prueba, verificar que genere remito
- [ ] Borrar el cliente, el producto y la venta de prueba

---

## 7. Capacitación al cliente

Ver el manual de usuario (`/docs/manual.pdf`, lo prepara Tomás).

Recordá darle al cliente:

- URL del sistema
- Credenciales del admin (en sobre cerrado, no por WhatsApp)
- Manual de usuario impreso/encuadernado
- Forzar cambio de contraseña en el primer login (pantalla de
  `/usuarios/[id]/editar`)

---

## 8. Cierre interno

- [ ] Borrar las env vars `SEED_ADMIN_PASSWORD` y `SEED_ADMIN_EMAIL` del
      proyecto Vercel (el admin ya está creado en la DB)
- [ ] Guardar todas las credenciales (Neon URL, Vercel project, admin
      password) en el gestor compartido bajo el cliente
- [ ] Configurar UptimeRobot para monitorear la URL nueva
- [ ] Agregar la URL a la rotación de backups diarios (script de Tomás)
- [ ] Avisar al grupo que el cliente ya está en producción

---

## Apéndice: Costo mensual aproximado por cliente

| Concepto                       | Costo (USD/mes) |
|--------------------------------|-----------------|
| Neon Launch (10 proyectos)     | 1.90  (19 / 10) |
| Vercel Pro (proyectos ilim.)   | ~2     (compartido) |
| Anthropic API (OCR, variable)  | 2 – 5           |
| Dominio (anual prorrateado)    | 0.30            |
| **Total estimado**             | **~6 – 10**     |

Con mantenimiento mensual de $150.000 ARS por cliente, margen ~95 %.
