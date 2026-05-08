# Keepalive

Endpoint que ejecuta `SELECT 1` para mantener el compute de Neon despierto.

## Por qué existe

En el plan free de Neon, el compute se suspende a los 5 minutos sin actividad. La primera operación luego de la pausa toma 1-3 segundos (cold start), lo que el usuario percibe como "se trabó".

## Cómo se invoca

### Vercel Cron (Hobby = 1 ejecución/día)

`vercel.json` configura un solo ping diario a las 11:00 UTC. **Esto NO mantiene el compute despierto todo el día** — apenas garantiza que la BD esté accesible una vez.

### Solución recomendada: pinger externo gratuito

Para mantener el compute despierto durante el horario comercial:

1. Registrarse en [cron-job.org](https://cron-job.org) o [UptimeRobot](https://uptimerobot.com).
2. Crear un job que llame `GET https://sistema-mercofrut.vercel.app/api/keepalive` cada 4 min, en el horario que opera el negocio.
3. Configurar header: `Authorization: Bearer <KEEPALIVE_SECRET>`. El secret está en las variables de entorno de Vercel.

Alternativa: upgrade Neon a plan pago ($19/mes) que mantiene el compute siempre activo.

## Autenticación

El endpoint acepta requests con:
- header `x-vercel-cron` (lo agrega Vercel automáticamente cuando dispara su cron interno)
- header `Authorization: Bearer <KEEPALIVE_SECRET>` (para llamadas desde servicios externos)

Cualquier otra request devuelve 401.
