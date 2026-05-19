// Supabase Edge Function: stripe-webhook
// Handles Stripe payment_intent.succeeded events from mobile app
// Inserts into active_orders and sends Expo push notification

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function generateShortOrderId(storeSanityId: string): Promise<string> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("active_orders")
    .select("*", { count: "exact", head: true })
    .eq("store_sanity_id", storeSanityId)
    .gte("created_at", todayStart.toISOString());

  const num = (count ?? 0) + 1;
  return `#${String(num).padStart(3, "0")}`;
}

async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  if (!pushToken.startsWith("ExponentPushToken[")) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: pushToken, title, body, data, sound: "default" }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] Signature failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Handle both mobile (payment_intent.succeeded) and web (checkout.session.completed)
  if (
    event.type !== "payment_intent.succeeded" &&
    event.type !== "checkout.session.completed"
  ) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const obj = event.data.object as any;

  // Skip non-paid sessions
  if (event.type === "checkout.session.completed" && obj.payment_status !== "paid") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const meta = obj.metadata ?? {};

  console.log("META:", meta);

  const storeSanityId: string = meta.store_sanity_id ?? "";
  const studentName: string = meta.student_name || "Unknown";
  const collectionTimeLabel: string = meta.collection_time || "As Soon As Possible";
  const itemsJson: string = meta.items_json ?? "[]";
  const expoPushToken: string = meta.expo_push_token ?? "";
  const userId: string = meta.user_id ?? "";

  if (!storeSanityId) {
    console.error("[webhook] No store_sanity_id in metadata");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const timeOffsets: Record<string, number> = {
    "As Soon As Possible": 15,
    "In ~30 Minutes": 30,
    "In ~1 Hour": 60,
    "In ~2 Hours": 120,
  };
  const offsetMinutes = timeOffsets[collectionTimeLabel] ?? 15;
  const collectionTime = new Date(
    Date.now() + offsetMinutes * 60 * 1000
  ).toISOString();

  let items: Array<{ name: string; qty: number }> = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    console.error("[webhook] Failed to parse items_json");
  }

  const paymentIntentId =
    event.type === "payment_intent.succeeded"
      ? obj.id
      : (obj.payment_intent ?? obj.id);

  const shortOrderId = await generateShortOrderId(storeSanityId);

  const { error } = await supabase.from("active_orders").insert({
    store_sanity_id: storeSanityId,
    stripe_payment_intent_id: paymentIntentId,
    short_order_id: shortOrderId,
    student_name: studentName,
    items,
    collection_time: collectionTime,
    status: "paid",
    ...(userId ? { user_id: userId } : {}),
  });

  if (error) {
    // Ignore duplicate key errors (idempotency)
    if (!error.message?.includes("duplicate key")) {
      console.error("[webhook] Supabase insert error:", error);
      return new Response("Internal Server Error", {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  console.log(`✅ Order ${shortOrderId} (${studentName}) for ${JSON.stringify(meta, null, 2)} → store ${storeSanityId}`);

  // Send Expo push notification for mobile orders
  if (expoPushToken) {
    const collectionDate = new Date(collectionTime);
    const timeStr = collectionDate.toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
    });
    await sendExpoPushNotification(
      expoPushToken,
      "🍜 Order Confirmed!",
      `${shortOrderId} · Collect at ${timeStr}. We'll remind you when it's almost time!`,
      { orderId: shortOrderId }
    );
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
