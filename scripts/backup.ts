// scripts/backup.ts
import { loadConfig, buildFileName } from "./backup/config";
import { pgDump } from "./backup/dump";
import { uploadToDrive, cleanupOldBackups } from "./backup/drive";
import { notifyError } from "./backup/notify";
import { unlinkSync } from "fs";

async function main() {
  const config = loadConfig();
  const fileName = buildFileName();
  let filePath: string | null = null;

  try {
    console.log("=== Backup Mercofrut ===");
    console.log(`Archivo: ${fileName}`);

    console.log("\n1. Ejecutando pg_dump...");
    filePath = pgDump(config.directUrl, fileName);

    console.log("\n2. Subiendo a Google Drive...");
    await uploadToDrive(
      filePath,
      config.googleDriveFolderId,
      config.googleServiceAccountJson
    );

    console.log("\n3. Limpiando backups viejos...");
    const deleted = await cleanupOldBackups(
      config.googleDriveFolderId,
      config.googleServiceAccountJson,
      config.retentionDays
    );
    console.log(`   ${deleted} backup(s) viejo(s) eliminado(s)`);

    console.log("\n=== Backup completado OK ===");
  } catch (err) {
    console.error("\n!!! Backup FALLO !!!", err);
    try {
      await notifyError(
        config.resendApiKey,
        config.alertEmail,
        "backup",
        err
      );
    } catch {
      console.error("Tampoco se pudo enviar el email de alerta.");
    }
    process.exit(1);
  } finally {
    if (filePath) {
      try {
        unlinkSync(filePath);
      } catch {}
    }
  }
}

main();
