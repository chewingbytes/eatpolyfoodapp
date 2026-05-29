// Supabase Edge Function: send-daily-preorders
// Triggered by Supabase cron at 2:00 AM UTC (10:00 AM SGT) daily.
// Fetches today's pre-orders per store and sends a WhatsApp summary
// to each vendor's contactNumber from Sanity.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SANITY_PROJECT_ID = Deno.env.get("SANITY_PROJECT_ID") ?? "";
const SANITY_DATASET = Deno.env.get("SANITY_DATASET") ?? "production";
const SANITY_WRITE_TOKEN = Deno.env.get("SANITY_WRITE_TOKEN") ?? "";
const WHATSAPP_SYSTEM_TOKEN = Deno.env.get("WHATSAPP_SYSTEM_TOKEN") ?? "";
const PHONE_NUMBER_ID = Deno.env.get("PHONE_NUMBER_ID") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

type OrderItem = { name: string; qty: number };

type Order = {
  short_order_id: string;
  items: OrderItem[];
  collection_time: string;
  store_sanity_id: string;
};

// ---------------------------------------------------------------------------
// Sanity helpers
// ---------------------------------------------------------------------------

async function fetchStoreInfo(
  storeId: string
): Promise<{ name: string; contactNumber: string } | null> {
  const query = encodeURIComponent(
    `*[_type == "store" && _id == "${storeId}"][0]{ name, contactNumber }`
  );
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SANITY_WRITE_TOKEN}` },
  });
  const data = await res.json();
  return data.result ?? null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOrderList(orders: Order[]): string {
  const lines: string[] = [];
  for (const order of orders) {
    lines.push(`${order.short_order_id} · ${formatTime(order.collection_time)}`);
    for (const item of order.items) {
      lines.push(`  - ${item.name} \u00d7${item.qty}`);
    }
  }
  const text = lines.join("\n");
  // WhatsApp body parameters have a ~1024-char cap — truncate gracefully
  return text.length > 900 ? text.slice(0, 897) + "..." : text;
}

// ---------------------------------------------------------------------------
// WhatsApp sender
// ---------------------------------------------------------------------------

async function sendWhatsApp(
  to: string,
  storeName: string,
  dateStr: string,
  orderList: string,
  totalCount: number
): Promise<void> {
  const number = to.startsWith("+") ? to : `+65${to}`;
  const res = await fetch(
    `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_SYSTEM_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "template",
        template: {
          // Template must be approved in Meta Business Manager.
          // Body: "Hi {{1}}! Here are your pre-orders for {{2}} 🍜\n\n{{3}}\n\nTotal: {{4}} order(s). Good luck with the orders! ✅"
          name: "daily_preorder_summary",
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: storeName },  // {{1}} vendor name
                { type: "text", text: dateStr },     // {{2}} date
                { type: "text", text: orderList },   // {{3}} order list
                { type: "text", text: String(totalCount) }, // {{4}} total
              ],
            },
          ],
        },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // Compute today's date range in SGT
  const now = new Date();
  const sgtOffsetMs = 8 * 60 * 60 * 1000;
  const todaySGT = new Date(now.getTime() + sgtOffsetMs);
  const todayStr = todaySGT.toISOString().split("T")[0];
  const tomorrowStr = new Date(todaySGT.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const dateLabel = todaySGT.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  });

  // Fetch all orders with a collection_time today (SGT)
  const { data: orders, error } = await supabase
    .from("active_orders")
    .select("short_order_id, items, collection_time, store_sanity_id")
    .gte("collection_time", `${todayStr}T00:00:00+08:00`)
    .lt("collection_time", `${tomorrowStr}T00:00:00+08:00`)
    .in("status", ["pending", "preparing", "ready"])
    .order("collection_time", { ascending: true });

  if (error) {
    console.error("[send-daily-preorders] DB error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  if (!orders?.length) {
    console.log("[send-daily-preorders] No orders today — nothing to send.");
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
      status: 200,
    });
  }

  // Group orders by store
  const byStore: Record<string, Order[]> = {};
  for (const order of orders as Order[]) {
    if (!byStore[order.store_sanity_id]) byStore[order.store_sanity_id] = [];
    byStore[order.store_sanity_id].push(order);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [storeId, storeOrders] of Object.entries(byStore)) {
    try {
      const store = await fetchStoreInfo(storeId);

      if (!store?.contactNumber) {
        console.warn(
          `[send-daily-preorders] No contactNumber for store ${storeId} — skipping.`
        );
        skipped++;
        continue;
      }

      const orderList = formatOrderList(storeOrders);
      await sendWhatsApp(
        store.contactNumber,
        store.name,
        dateLabel,
        orderList,
        storeOrders.length
      );

      console.log(
        `\u2705 WhatsApp sent to ${store.name} (${store.contactNumber}): ${storeOrders.length} order(s)`
      );
      sent++;
    } catch (e: any) {
      console.error(`\u274c Failed for store ${storeId}:`, e.message);
      errors.push(`${storeId}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({ sent, skipped, errors }), {
    status: 200,
  });
});
