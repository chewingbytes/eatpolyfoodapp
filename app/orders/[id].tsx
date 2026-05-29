import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { sanityFetch } from "../../lib/sanity";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

type OrderItem = { name: string; qty: number; priceInCents?: number };

type Order = {
  id: string;
  short_order_id: string;
  store_sanity_id: string;
  student_name: string;
  items: OrderItem[];
  status: string;
  collection_time: string;
  created_at: string;
  stripe_payment_intent_id: string;
};

type SanityStore = {
  _id: string;
  name: string;
  stallNumber: string | null;
  canteen: {
    name: string;
    location: string | null;
    polytechnic: { name: string; shortName: string } | null;
  } | null;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; emoji: string; rotate: string }> = {
  pending:   { bg: colors.postit,     text: colors.pencil,       label: "Pending",    emoji: "👨\u200d🍳", rotate: "-1deg"   },
  collected: { bg: colors.greenLight,      text: colors.pencil + "88", label: "Collected", emoji: "✔️",         rotate: "0deg"    },
  expired:   { bg: "#f3f4f6",         text: "#6b7280",           label: "Expired",    emoji: "⌛",         rotate: "0.5deg"  },
};

const STEP_BG = ["#e0f2fe", "#fef9c3", "#dcfce7"];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [store, setStore] = useState<SanityStore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadOrder();
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    const { data, error } = await supabase
      .from("active_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) { setLoading(false); return; }
    console.log("DATA:", data);
    setOrder(data as Order);

    // Fetch store info from Sanity
    try {
      const sanityStore = await sanityFetch<SanityStore>(
        `*[_type == "store" && _id == $storeId][0] {
          _id,
          name,
          stallNumber,
          "canteen": canteen->{
            name,
            location,
            "polytechnic": polytechnic->{ name, shortName }
          }
        }`,
        { storeId: data.store_sanity_id }
      );
      setStore(sanityStore);
    } catch {
      // Non-fatal — show order without store details
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const badgeLabel =
    order.status === "pending" && order.collection_time
      ? `${cfg.emoji} Collect at ${new Date(order.collection_time).toLocaleTimeString("en-SG", {
          timeZone: "Asia/Singapore",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : `${cfg.emoji} ${cfg.label}`;
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const totalCents = items.reduce((sum, i) => sum + (i.priceInCents ?? 0) * i.qty, 0);
  const hasPrices = items.some((i) => i.priceInCents != null);
  const storeName = store?.name ?? "your store";
  const stallInfo = [store?.stallNumber, store?.canteen?.name, store?.canteen?.polytechnic?.shortName]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Order header ── */}
      <WobblyCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orderIdLabel}>order</Text>
            <Text style={styles.orderId}>{order.short_order_id}</Text>
          </View>
          <StickyBadge
            label={badgeLabel}
            bg={cfg.bg}
            color={cfg.text}
            rotate={cfg.rotate}
          />
        </View>
        <Text style={styles.placedAt}>
          placed on {new Date(order.created_at).toLocaleString("en-SG", {
            timeZone: "Asia/Singapore",
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </Text>
      </WobblyCard>

      {/* ── Pickup instructions ── */}
      <Text style={styles.sectionTitle}>📦 how to collect</Text>

      {/* Step 1 */}
      <WobblyCard bg={STEP_BG[0]} style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepTitle}>visit the store</Text>
        </View>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{storeName}</Text>
          {!!stallInfo && <Text style={styles.storeDetail}>{stallInfo}</Text>}
          {!!store?.canteen?.location && (
            <Text style={styles.storeDetail}>📍 {store.canteen.location}</Text>
          )}
        </View>
      </WobblyCard>

      {/* Step 2 */}
      <WobblyCard bg={STEP_BG[1]} style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.stepTitle}>show your order number</Text>
        </View>
        <View style={styles.orderNumDisplay}>
          <Text style={styles.orderNumLabel}>your order number</Text>
          <Text style={styles.orderNumBig}>{order.short_order_id}</Text>
          <Text style={styles.orderNumHint}>show this to the vendor at the counter</Text>
        </View>
      </WobblyCard>

      {/* Step 3 */}
      <WobblyCard bg={STEP_BG[2]} style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.stepTitle}>collect your food! 🎉</Text>
        </View>
        <Text style={styles.stepBody}>
          Once the vendor confirms your order, grab your food and enjoy!
        </Text>
      </WobblyCard>

      {/* ── Order summary ── */}
      <Text style={styles.sectionTitle}>🧾 order summary</Text>
      <WobblyCard bg={colors.postit} decoration="tape" style={styles.summaryCard}>
        <View style={styles.summaryMeta}>
          <Text style={styles.summaryMetaText}>Order {order.short_order_id}</Text>
          <Text style={styles.summaryMetaText}>
            {new Date(order.created_at).toLocaleDateString("en-SG", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.divider} />

        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>× {item.qty}</Text>
            </View>
            {item.priceInCents != null ? (
              <Text style={styles.itemPrice}>
                ${((item.priceInCents * item.qty) / 100).toFixed(2)}
              </Text>
            ) : null}
          </View>
        ))}

        {hasPrices && (
          <>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmt}>${(totalCents / 100).toFixed(2)}</Text>
            </View>
          </>
        )}
      </WobblyCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  errorText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },

  // Header card
  headerCard: { padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  orderIdLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "66", textTransform: "uppercase", letterSpacing: 1 },
  orderId: { fontFamily: "Kalam_700Bold", fontSize: 30, color: colors.pencil },
  placedAt: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77" },

  // Sections
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil, paddingHorizontal: 4 },

  // Steps
  stepCard: { padding: 16 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pencil, alignItems: "center", justifyContent: "center" },
  stepNum: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.white },
  stepTitle: { fontFamily: "Kalam_700Bold", fontSize: 17, color: colors.pencil, flex: 1 },
  stepBody: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99", lineHeight: 22 },

  // Store info
  storeInfo: { paddingLeft: 44, gap: 4 },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil },
  storeDetail: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },

  // Order number display
  orderNumDisplay: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: colors.pencil,
    gap: 6,
    // Hard shadow
    shadowColor: colors.pencil,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  orderNumLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88", textTransform: "uppercase", letterSpacing: 1 },
  orderNumBig: { fontFamily: "Kalam_700Bold", fontSize: 40, color: colors.pencil, letterSpacing: 4, lineHeight: 66 },
  orderNumHint: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77", textAlign: "center" },

  // Summary
  summaryCard: { padding: 16 },
  summaryMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryMetaText: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "88" },
  divider: { height: 1.5, backgroundColor: colors.pencil + "22", marginVertical: 10, borderStyle: "dashed" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  itemLeft: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1 },
  itemName: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil, flex: 1 },
  itemQty: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  itemPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  totalLabel: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil },
  totalAmt: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.accent },
});
