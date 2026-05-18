// scripts/backup/notify.ts
import { Resend } from "resend";

export async function notifyError(
  apiKey: string,
  to: string,
  step: string,
  error: unknown
): Promise<void> {
  const resend = new Resend(apiKey);
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  try {
    await resend.emails.send({
      from: "Backup Mercofrut <onboarding@resend.dev>",
      to,
      subject: `[BACKUP FALLO] Error en: ${step}`,
      text: [
        `El backup automatico de Mercofrut fallo.`,
        ``,
        `Paso que fallo: ${step}`,
        `Error: ${message}`,
        `Timestamp: ${timestamp}`,
        ``,
        `Revisar el workflow en GitHub Actions para mas detalles.`,
      ].join("\n"),
    });
    console.log(`Email de alerta enviado a ${to}`);
  } catch (emailErr) {
    console.error(`No se pudo enviar el email de alerta:`, emailErr);
    throw emailErr;
  }
}
