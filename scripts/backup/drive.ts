// scripts/backup/drive.ts
import { google } from "googleapis";
import { createReadStream } from "fs";
import { basename } from "path";

function getAuth(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

export async function uploadToDrive(
  filePath: string,
  folderId: string,
  serviceAccountJson: string
): Promise<string> {
  const auth = getAuth(serviceAccountJson);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: basename(filePath),
      parents: [folderId],
    },
    media: {
      mimeType: "application/gzip",
      body: createReadStream(filePath),
    },
    fields: "id,name,size",
  });

  console.log(
    `Subido a Drive: ${res.data.name} (${res.data.size} bytes, id: ${res.data.id})`
  );
  return res.data.id!;
}

export async function cleanupOldBackups(
  folderId: string,
  serviceAccountJson: string,
  retentionDays: number
): Promise<number> {
  const auth = getAuth(serviceAccountJson);
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,createdTime)",
    pageSize: 1000,
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  let deleted = 0;
  for (const file of res.data.files ?? []) {
    const match = file.name?.match(/^mercofrut-(\d{4}-\d{2}-\d{2})-/);
    if (!match) continue;

    const fileDate = new Date(match[1]);
    if (fileDate < cutoff) {
      await drive.files.delete({ fileId: file.id! });
      console.log(`Eliminado backup viejo: ${file.name}`);
      deleted++;
    }
  }

  return deleted;
}
