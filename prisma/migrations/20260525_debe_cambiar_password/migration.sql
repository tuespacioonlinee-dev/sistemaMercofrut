-- Cambio de contraseña obligatorio en el primer login.
-- debeCambiarPassword: si es true, el usuario debe cambiar su contraseña antes de operar.
-- passwordCambiadaEn: timestamp del último cambio efectivo (auditoría).

ALTER TABLE "Usuario" ADD COLUMN "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "passwordCambiadaEn" TIMESTAMP(3);
