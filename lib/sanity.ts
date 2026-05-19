const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID ?? "";
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET ?? "production";
const API_VERSION = "2024-01-01";

// Use Sanity's REST API directly — avoids @sanity/client's OpenTelemetry
// dynamic imports that Hermes cannot parse.
const BASE_URL = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}`;

export async function sanityFetch<T>(
  query: string,
  params: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
  });
  if (!response.ok) {
    throw new Error(`Sanity fetch failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.result as T;
}
