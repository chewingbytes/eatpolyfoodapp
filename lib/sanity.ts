const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID ?? "";
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET ?? "production";
const API_VERSION = "2024-01-01";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

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

/**
 * Patches a Sanity document via the vendor-patch edge function.
 * The write token is kept server-side; only authenticated vendors can call this.
 */
export async function vendorPatch(
  authToken: string,
  documentId: string,
  patch: { set?: Record<string, unknown>; unset?: string[] }
): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vendor-patch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ documentId, ...patch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Patch failed: ${res.status}`);
  }
}
