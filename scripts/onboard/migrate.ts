// scripts/onboard/migrate.ts
import { execSync } from "child_process";

export function runMigrations(directUrl: string): string {
  const output = execSync("npx prisma migrate deploy", {
    env: { ...process.env, DIRECT_URL: directUrl, DATABASE_URL: directUrl },
    encoding: "utf-8",
    timeout: 2 * 60 * 1000,
    cwd: process.cwd(),
  });

  console.log(output);
  return output;
}
