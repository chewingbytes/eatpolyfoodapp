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

  const { items, collectionTime, storeId, expoPushToken, userId } = body;


  if (!items?.length) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    items.map((i) => ({ name: cleanName(i.name), qty: i.qty, priceInCents: i.priceInCents }))
  ).slice(0, 490);

  // --- Validate collection_time (ISO SGT datetime, e.g. "2026-05-21T11:00:00+08:00") ---
  const collectionDt = new Date(collectionTime);
  if (isNaN(collectionDt.getTime())) {
    return new Response(JSON.stringify({ error: "Invalid collection time format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Derive SGT equivalents (UTC+8) without any Intl dependency
  const sgtOffsetMs = 8 * 60 * 60 * 1000;
  const nowSGT = new Date(Date.now() + sgtOffsetMs);
  const collectionSGT = new Date(collectionDt.getTime() + sgtOffsetMs);
  const collectionHour = collectionSGT.getUTCHours();
  const collectionMin = collectionSGT.getUTCMinutes();
  const collectionDateStr = collectionSGT.toISOString().split("T")[0];

  const todayStr = nowSGT.toISOString().split("T")[0];
  const tomorrowStr = new Date(nowSGT.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const canOrderToday = nowSGT.getUTCHours() < 10;
  const validDates = canOrderToday ? [todayStr, tomorrowStr] : [tomorrowStr];

  if (!validDates.includes(collectionDateStr)) {
    return new Response(
      JSON.stringify({ error: "Today's ordering window has closed (cutoff: 10:00 AM). Please select tomorrow." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const isValidTime =
    collectionHour >= 11 &&
    (collectionHour < 17 || (collectionHour === 17 && collectionMin === 0)) &&
    (collectionMin === 0 || collectionMin === 30);

  if (!isValidTime) {
    return new Response(
      JSON.stringify({ error: "Collection time must be between 11:00 AM and 5:00 PM in 30-minute slots" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // --- End validation ---

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "sgd",
    payment_method_types: ["paynow"],
    metadata: {
      store_sanity_id: storeId,
      collection_time: collectionTime,
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
