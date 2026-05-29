// Supabase Edge Function: vendor-patch
// Proxies Sanity document patches from vendor users.
// The Sanity write token never leaves the server.

const SANITY_PROJECT_ID = Deno.env.get("SANITY_PROJECT_ID") ?? "";
const SANITY_DATASET = Deno.env.get("SANITY_DATASET") ?? "production";
const SANITY_WRITE_TOKEN = Deno.env.get("SANITY_WRITE_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("EXPO_SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("EXPO_SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PatchOperation = {
  documentId: string;
  set?: Record<string, unknown>;
  unset?: string[];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // ── 1. Verify user JWT ────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Get user from Supabase Auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!userRes.ok) {
    return json({ error: "Invalid token" }, 401);
  }

  const { id: userId, email } = await userRes.json();
  if (!userId || !email) {
    return json({ error: "Could not identify user" }, 401);
  }

  // ── 2. Verify the user is a vendor ────────────────────────────────────────
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profile?user_id=eq.${userId}&select=is_vendor`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!profileRes.ok) {
    const profileErr = await profileRes.text().catch(() => "");
    return json({ error: `Could not verify vendor status: ${profileRes.status} ${profileErr}` }, 500);
  }

  const profiles = await profileRes.json();
  if (!profiles?.[0]?.is_vendor) {
    return json({ error: "Forbidden: not a vendor" }, 403);
  }

  // ── 3. Parse patch body ───────────────────────────────────────────────────
  let body: PatchOperation;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { documentId, set, unset } = body;
  if (!documentId) {
    return json({ error: "documentId is required" }, 400);
  }

  // ── 4. Fetch the document from Sanity to verify it belongs to this vendor ─
  const verifyQuery = encodeURIComponent(
    `*[_id == "${documentId}"][0] {
      _type,
      "storeEmail": select(
        _type == "foodProduct" => store->vendorEmail,
        _type == "addOnGroup"  => store->vendorEmail,
        _type == "store"       => vendorEmail
      )
    }`
  );

  const verifyRes = await fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${verifyQuery}`,
    {
      headers: {
        Authorization: `Bearer ${SANITY_WRITE_TOKEN}`,
      },
    }
  );

  if (!verifyRes.ok) {
    return json({ error: "Could not verify document ownership" }, 500);
  }

  const { result: doc } = await verifyRes.json();
  if (!doc || doc.storeEmail !== email) {
    return json({ error: "Forbidden: document does not belong to your store" }, 403);
  }

  // ── 5. Build and apply the Sanity patch mutation ──────────────────────────
  type MutationPatch = { id: string; set?: Record<string, unknown>; unset?: string[] };
  const buildPatch = (id: string): MutationPatch => {
    const p: MutationPatch = { id };
    if (set && Object.keys(set).length > 0) p.set = set;
    if (unset && unset.length > 0) p.unset = unset;
    return p;
  };

  const sanityMutate = (mutations: unknown[]) =>
    fetch(
      `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${SANITY_DATASET}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SANITY_WRITE_TOKEN}`,
        },
        body: JSON.stringify({ mutations }),
      }
    );

  // Patch the published document (required — fail if this errors)
  const mutateRes = await sanityMutate([{ patch: buildPatch(documentId) }]);

  if (!mutateRes.ok) {
    const err = await mutateRes.text();
    return json({ error: `Sanity mutation failed: ${err}` }, 500);
  }

  // Also patch the draft if one exists — fire-and-forget, never fail on this
  sanityMutate([{ patch: buildPatch(`drafts.${documentId}`) }]).catch(() => {});

  const result = await mutateRes.json();
  return json({ ok: true, result });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
