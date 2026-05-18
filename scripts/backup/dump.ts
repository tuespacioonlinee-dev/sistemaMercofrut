// scripts/backup/dump.ts
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function pgDump(connectionUrl: string, fileName: string): string {
  const outDir = join(tmpdir(), "mercofrut-backups");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const outPath = join(outDir, fileName);

  execSync(
    `pg_dump "${connectionUrl}" --format=plain --no-owner --no-acl | gzip > "${outPath}"`,
    {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 5 * 60 * 1000, // 5 min max
    }
  );

  const stats = execSync(`ls -lh "${outPath}"`, { encoding: "utf-8" });
  console.log(`Dump creado: ${stats.trim()}`);

  return outPath;
}
