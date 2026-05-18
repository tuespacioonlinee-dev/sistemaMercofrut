// scripts/onboard/neon.ts

const NEON_API_BASE = "https://console.neon.tech/api/v2";

export interface NeonProjectResult {
  projectId: string;
  poolerUrl: string;
  directUrl: string;
}

export async function createNeonProject(
  apiKey: string,
  name: string
): Promise<NeonProjectResult> {
  const res = await fetch(`${NEON_API_BASE}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project: {
        name,
        region_id: "aws-sa-east-1",
        pg_version: 17,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Neon API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  const project = data.project;
  const connectionUri = data.connection_uris?.[0];

  if (!connectionUri) {
    throw new Error(
      `Neon creo el proyecto ${project.id} pero no devolvio connection URI`
    );
  }

  const directHost = connectionUri.connection_parameters.host;
  const poolerHost = directHost.replace(
    /\.(.+)\.aws\.neon\.tech$/,
    "-pooler.$1.aws.neon.tech"
  );
  const user = connectionUri.connection_parameters.role;
  const password = connectionUri.connection_parameters.password;
  const database = connectionUri.connection_parameters.database;

  const params = "sslmode=require&channel_binding=require";
  const poolerParams = `${params}&connection_limit=5&pool_timeout=15`;

  return {
    projectId: project.id,
    directUrl: `postgresql://${user}:${password}@${directHost}/${database}?${params}`,
    poolerUrl: `postgresql://${user}:${password}@${poolerHost}/${database}?${poolerParams}`,
  };
}
