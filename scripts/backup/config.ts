// scripts/backup/config.ts

interface BackupConfig {
  directUrl: string;
  googleServiceAccountJson: string;
  googleDriveFolderId: string;
  resendApiKey: string;
  alertEmail: string;
  retentionDays: number;
}

export function loadConfig(): BackupConfig {
  const required = {
    directUrl: process.env.DIRECT_URL,
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Faltan env vars: ${missing.join(", ")}`);
  }

  return {
    directUrl: required.directUrl!,
    googleServiceAccountJson: required.googleServiceAccountJson!,
    googleDriveFolderId: required.googleDriveFolderId!,
    resendApiKey: required.resendApiKey!,
    alertEmail: required.alertEmail!,
    retentionDays: Number(process.env.RETENTION_DAYS) || 120,
  };
}

export function buildFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `mercofrut-${date}-${time}.sql.gz`;
}
