// Supabase Edge Function: create-payment-intent
// Creates a Stripe PaymentIntent for PayNow and stores order metadata

import Stripe from "https://esm.sh/stripe@16.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cleanName(name: string): string {
  return name
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00AD\u2060-\u2064]/g, "")
    .trim()
    .slice(0, 60);
}

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

  let body: {
    items: { name: string; qty: number; priceInCents: number }[];
    studentName: string;
    collectionTime: string;
    storeId: string;
    storeName: string;
    expoPushToken?: string;
    userId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { items, studentName, collectionTime, storeId, expoPushToken, userId } = body;


  if (!items?.length) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!studentName?.trim()) {
    return new Response(
      JSON.stringify({ error: "Student name is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!storeId) {
    return new Response(JSON.stringify({ error: "Missing store ID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amountInCents = items.reduce(
    (sum, i) => sum + i.priceInCents * i.qty,
    0
  );

  // Minimum charge in SGD is $0.50
  if (amountInCents < 50) {
    return new Response(
      JSON.stringify({ error: "Order total is below minimum" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const itemsJson = JSON.stringify(
    items.map((i) => ({ name: cleanName(i.name), qty: i.qty }))
  ).slice(0, 490);

  const collectionTimeLabels: Record<string, string> = {
    asap: "As Soon As Possible",
    "30m": "In ~30 Minutes",
    "1h": "In ~1 Hour",
    "2h": "In ~2 Hours",
  };

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "sgd",
    payment_method_types: ["paynow"],
    metadata: {
      store_sanity_id: storeId,
      student_name: cleanName(studentName.trim()),
      collection_time:
        collectionTimeLabels[collectionTime] ?? "As Soon As Possible",
      items_json: itemsJson,
      expo_push_token: expoPushToken ?? "",
      user_id: userId ?? "",
      source: "mobile_app",
    },
  });

  return new Response(
    JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
