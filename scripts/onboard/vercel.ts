// scripts/onboard/vercel.ts
import { randomBytes } from "crypto";

const VERCEL_API_BASE = "https://api.vercel.com";

export interface VercelProjectResult {
  projectId: string;
  projectName: string;
}

async function vercelFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${VERCEL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API error (${res.status}) ${path}: ${body}`);
  }

  return res.json();
}

export async function createVercelProject(
  token: string,
  githubToken: string,
  name: string,
  repoFullName: string
): Promise<VercelProjectResult> {
  const data = await vercelFetch("/v10/projects", token, {
    method: "POST",
    body: JSON.stringify({
      name,
      framework: "nextjs",
      gitRepository: {
        type: "github",
        repo: repoFullName,
      },
    }),
  });

  return {
    projectId: data.id,
    projectName: data.name,
  };
}

export async function setEnvVars(
  token: string,
  projectId: string,
  vars: Record<string, string>
): Promise<void> {
  const envVars = Object.entries(vars).map(([key, value]) => ({
    key,
    value,
    target: ["production", "preview", "development"],
    type: "encrypted",
  }));

  await vercelFetch(`/v10/projects/${projectId}/env`, token, {
    method: "POST",
    body: JSON.stringify(envVars),
  });
}

export async function addDomain(
  token: string,
  projectId: string,
  domain: string
): Promise<void> {
  await vercelFetch(`/v10/projects/${projectId}/domains`, token, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
}

export function generateAuthSecret(): string {
  return randomBytes(32).toString("base64");
}
