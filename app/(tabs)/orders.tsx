import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/auth";
import { LoadingView } from "../../components/LoadingView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

type Order = {
  id: string;
  short_order_id: string;
  store_sanity_id: string;
  student_name: string;
  items: { name: string; qty: number }[];
  status: string;
  collection_time: string;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; emoji: string; rotate: string }> = {
  paid:      { bg: colors.postit,        text: colors.pencil,  label: "Preparing",        emoji: "👨‍🍳", rotate: "-1deg" },
  ready:     { bg: colors.greenLight,    text: "#166534",      label: "Ready! 🎉 Collect now", emoji: "✅", rotate: "1deg" },
  collected: { bg: colors.muted,         text: colors.pencil + "88", label: "Collected",  emoji: "✔️", rotate: "0deg" },
  cancelled: { bg: "#fee2e2",            text: colors.accent,  label: "Cancelled",        emoji: "✖️", rotate: "-0.5deg" },
};

export default function OrdersScreen() {
  const session = useAuthStore((s) => s.session);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("active_orders")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setOrders(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "active_orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  if (!session) {
    return (
      <View style={styles.signInContainer}>
        <Text style={styles.signInEmoji}>📋</Text>
        <Text style={styles.signInTitle}>track your orders!</Text>
        <Text style={styles.signInSubtitle}>sign in to see your order history and get live status updates</Text>
        <View style={styles.signInBtnWrap}>
          <HandButton label="Sign In →" onPress={() => router.push("/(auth)/login")} variant="primary" />
        </View>
      </View>
    );
  }

  if (loading) return <LoadingView />;

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>no orders yet</Text>
            <Text style={styles.emptySubtitle}>your orders will appear here after checkout</Text>
            <View style={styles.emptyBtnWrap}>
              <HandButton label="Browse Canteens →" onPress={() => router.push("/(tabs)")} variant="secondary" />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.paid;
          const collectionDate = new Date(item.collection_time);
          const rotation = ["-1deg", "0.5deg", "-0.5deg", "1deg"][index % 4];
          return (
            <View style={{ transform: [{ rotate: rotation }] }}>
              <WobblyCard shadowSize={4}>
                <View style={styles.orderCard}>
                  {/* Order ID + status */}
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>{item.short_order_id}</Text>
                    <StickyBadge
                      label={`${cfg.emoji} ${cfg.label}`}
                      bg={cfg.bg}
                      color={cfg.text}
                      rotate={cfg.rotate}
                    />
                  </View>

                  {/* Items list */}
                  <View style={styles.itemsWrap}>
                    {(Array.isArray(item.items) ? item.items : []).map((food, i) => (
                      <Text key={i} style={styles.foodItem}>· {food.qty}× {food.name}</Text>
                    ))}
                  </View>

                  {/* Footer row */}
                  <View style={styles.orderFooter}>
                    <View style={styles.footerLeft}>
                      <Ionicons name="time-outline" size={14} color={colors.pencil + "66"} />
                      <Text style={styles.footerText}>
                        collect by {collectionDate.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Text style={styles.footerDate}>
                      {new Date(item.created_at).toLocaleDateString("en-SG")}
                    </Text>
                  </View>

                  {/* Ready status special callout */}
                  {item.status === "ready" && (
                    <View style={styles.readyBanner}>
                      <Text style={styles.readyText}>🎉 Go collect your food now!</Text>
                    </View>
                  )}
                </View>
              </WobblyCard>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 20, gap: 20, paddingBottom: 40 },
  // Sign-in prompt
  signInContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, paddingHorizontal: 32 },
  signInEmoji: { fontSize: 64, marginBottom: 16 },
  signInTitle: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.pencil, marginBottom: 8 },
  signInSubtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", textAlign: "center", marginBottom: 24 },
  signInBtnWrap: { alignSelf: "stretch", paddingHorizontal: 16 },
  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontFamily: "Kalam_700Bold", fontSize: 24, color: colors.pencil, marginBottom: 6 },
  emptySubtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", textAlign: "center", marginBottom: 20 },
  emptyBtnWrap: {},
  // Order card
  orderCard: { padding: 16 },
  orderHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  orderId: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.pencil },
  itemsWrap: { borderLeftWidth: 2, borderLeftColor: colors.muted, paddingLeft: 12, marginBottom: 10, gap: 2 },
  foodItem: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99" },
  orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: colors.muted, paddingTop: 10, borderStyle: "dashed" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77" },
  footerDate: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "55" },
  readyBanner: { marginTop: 10, backgroundColor: colors.greenLight, borderRadius: 8, padding: 10, alignItems: "center", borderWidth: 2, borderColor: "#16a34a", borderStyle: "dashed" },
  readyText: { fontFamily: "Kalam_700Bold", fontSize: 15, color: "#166534" },
});
