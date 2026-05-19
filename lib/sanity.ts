import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID ?? "",
  dataset: process.env.EXPO_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

export async function sanityFetch<T>(
  query: string,
  params: Record<string, string> = {}
): Promise<T> {
  return sanityClient.fetch<T>(query, params);
}
