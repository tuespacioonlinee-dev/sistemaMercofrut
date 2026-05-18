// scripts/backup/dump.ts
import { execSync } from "child_process";
import { existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function pgDump(connectionUrl: string, fileName: string): string {
  const outDir = join(tmpdir(), "mercofrut-backups");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const outPath = join(outDir, fileName);

  execSync(
    `pg_dump --format=plain --no-owner --no-acl | gzip > "${outPath}"`,
    {
      env: { ...process.env, PGDATABASE: connectionUrl },
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 5 * 60 * 1000,
    }
  );

  const size = statSync(outPath).size;
  console.log(`Dump creado: ${outPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  return outPath;
}
