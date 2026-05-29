import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../store/cart";
import { sanityFetch } from "../../lib/sanity";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors, wobblyMd } from "../../lib/theme";

const FALLBACK_SLOTS = [
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00",
];

function formatSlot(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function toSGT(utc: Date, dayOffset = 0): Date {
  return new Date(utc.getTime() + (8 * 60 * 60 * 1000) + (dayOffset * 24 * 60 * 60 * 1000));
}

function getSGTDateStr(utc: Date, dayOffset = 0): string {
  return toSGT(utc, dayOffset).toISOString().split("T")[0];
}

async function fetchServerTime(): Promise<Date> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Singapore", {
      signal: controller.signal,
    });
    clearTimeout(id);
    const data = await res.json();
    return new Date(data.datetime);
  } catch {
    return new Date();
  }
}

export default function CartScreen() {
  const { items, removeItem, updateQty, totalCents } = useCartStore();

  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [loadingTime, setLoadingTime] = useState(true);
  const [canOrderToday, setCanOrderToday] = useState(false);
  const [selectedDate, setSelectedDate] = useState<"today" | "tomorrow">("tomorrow");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(FALLBACK_SLOTS);

  const storeId = items[0]?.storeId ?? null;

  // Fetch server time and store time slots in parallel
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchServerTime(),
      storeId
        ? sanityFetch<{ timeSlots: string[] | null }>(
            `*[_type == "store" && _id == $storeId][0]{ timeSlots }`,
            { storeId }
          ).catch(() => null)
        : Promise.resolve(null),
    ]).then(([t, storeData]) => {
      if (cancelled) return;
      const sgtHour = toSGT(t).getUTCHours();
      const before10am = sgtHour < 10;
      setServerTime(t);
      setCanOrderToday(before10am);
      setSelectedDate(before10am ? "today" : "tomorrow");
      const slots = storeData?.timeSlots?.length ? storeData.timeSlots : FALLBACK_SLOTS;
      setTimeSlots(slots);
      setLoadingTime(false);
    });
    return () => { cancelled = true; };
  }, [storeId]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>cart's empty!</Text>
        <Text style={styles.emptySubtitle}>browse canteens and add some food</Text>
        <View style={styles.emptyBtnWrap}>
          <HandButton
            label="Browse Canteens →"
            onPress={() => router.push("/(tabs)")}
            variant="primary"
          />
        </View>
        {/* Doodle decoration */}
        <Text style={styles.emptyDoodle}>✏️ ~ ~ ~ ✏️</Text>
      </View>
    );
  }

  const storeName = items[0]?.storeName ?? "";
  const total = totalCents();

  function handleCheckout() {
    if (!selectedSlot) {
      Alert.alert("Pick a time! ⏰", "Please select a collection time slot");
      return;
    }
    const base = serverTime ?? new Date();
    const dayOffset = selectedDate === "tomorrow" ? 1 : 0;
    const collectionTime = `${getSGTDateStr(base, dayOffset)}T${selectedSlot}:00+08:00`;
    router.push({ pathname: "/checkout", params: { collectionTime } });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.storeRow}>
            <Text style={styles.storeLabel}>🍜 ordering from</Text>
            <Text style={styles.storeName}>{storeName}</Text>
            <View style={styles.dashedLine} />
          </View>
        }
        renderItem={({ item }) => (
          <WobblyCard style={styles.cartItem}>
            <View style={styles.cartItemInner}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.addOns?.length ? (
                  <View style={styles.breakdown}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>base</Text>
                      <Text style={styles.breakdownAmt}>
                        ${((item.basePriceInCents ?? item.priceInCents) / 100).toFixed(2)}
                      </Text>
                    </View>
                    {item.addOns.map((ao, i) => (
                      <View key={i} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel} numberOfLines={1}>+ {ao.name}</Text>
                        <Text style={styles.breakdownAmt}>
                          {ao.priceInCents === 0 ? "free" : `$${(ao.priceInCents / 100).toFixed(2)}`}
                        </Text>
                      </View>
                    ))}
                    <Text style={styles.itemPrice}>${(item.priceInCents / 100).toFixed(2)} each</Text>
                  </View>
                ) : (
                  <Text style={styles.itemPrice}>${(item.priceInCents / 100).toFixed(2)} each</Text>
                )}
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, item.qty - 1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="remove" size={16} color={colors.pencil} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity
                  onPress={() => updateQty(item.id, item.qty + 1)}
                  style={[styles.qtyBtn, styles.qtyBtnAdd]}
                >
                  <Ionicons name="add" size={16} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          </WobblyCard>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Collection time */}
            <WobblyCard style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⏱️ when to collect?</Text>
              {loadingTime ? (
                <View style={styles.timeLoading}>
                  <ActivityIndicator size="small" color={colors.pencil + "77"} />
                  <Text style={styles.timeLoadingText}>checking order window…</Text>
                </View>
              ) : (
                <>
                  {canOrderToday ? (
                    <View style={styles.dateTabs}>
                      {(["today", "tomorrow"] as const).map((d) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
                          style={[styles.dateTab, selectedDate === d && styles.dateTabSelected]}
                        >
                          <Text style={[styles.dateTabLabel, selectedDate === d && styles.dateTabLabelSelected]}>
                            {d === "today" ? "Today" : "Tomorrow"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.tomorrowNotice}>
                      <Text style={styles.tomorrowNoticeText}>📅 Ordering for tomorrow</Text>
                      <Text style={styles.tomorrowNoticeReason}>Ordering window closes at 10:00 AM daily</Text>
                    </View>
                  )}
                  <Text style={styles.slotNote}>Available: {timeSlots.length ? `${formatSlot(timeSlots[0])} – ${formatSlot(timeSlots[timeSlots.length - 1])}` : ""}</Text>
                  <View style={styles.slotGrid}>
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => setSelectedSlot(slot)}
                          style={[styles.slotBtn, isSelected && styles.slotBtnSelected]}
                        >
                          <Text style={[styles.slotLabel, isSelected && styles.slotLabelSelected]}>
                            {formatSlot(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </WobblyCard>

            {/* Order summary — looks like a notepad tear-off */}
            <WobblyCard style={styles.sectionCard} bg={colors.postit}>
              <Text style={styles.summaryTitle}>📋 order total</Text>
              {items.map((item) => (
                <View key={item.id} style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>{item.name} × {item.qty}</Text>
                  <Text style={styles.summaryAmt}>${((item.priceInCents * item.qty) / 100).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmt}>${(total / 100).toFixed(2)}</Text>
              </View>
            </WobblyCard>
          </View>
        }
      />

      {/* Sticky checkout bar */}
      <View style={styles.checkoutBar}>
        <HandButton
          label={`Pay with PayNow · $${(total / 100).toFixed(2)} →`}
          onPress={handleCheckout}
          variant="danger"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 20, gap: 16, paddingBottom: 20 },
  // Empty state
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.pencil, marginBottom: 8 },
  emptySubtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", textAlign: "center", marginBottom: 24 },
  emptyBtnWrap: { alignSelf: "stretch", paddingHorizontal: 16 },
  emptyDoodle: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.muted, marginTop: 32 },
  // Store header
  storeRow: { marginBottom: 4 },
  storeLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77" },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.pencil },
  dashedLine: { width: "100%", borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "33", marginTop: 12 },
  // Cart items
  cartItem: {},
  cartItemInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  cartItemInfo: { flex: 1 },
  itemName: { fontFamily: "Kalam_700Bold", fontSize: 17, color: colors.pencil },
  itemPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.ink, marginTop: 4 },
  breakdown: { marginTop: 4, gap: 1 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  breakdownLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77", flex: 1 },
  breakdownAmt: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.pencil, alignItems: "center", justifyContent: "center" },
  qtyBtnAdd: { backgroundColor: colors.pencil },
  qtyText: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil, minWidth: 20, textAlign: "center" },
  removeBtn: { marginLeft: 4, padding: 4 },
  // Footer sections
  footer: { gap: 16, marginTop: 8 },
  sectionCard: { padding: 16 },
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, marginBottom: 12 },
  // Time picker
  timeLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  timeLoadingText: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "77" },
  dateTabs: { flexDirection: "row", gap: 10, marginBottom: 14 },
  dateTab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: colors.pencil + "44", alignItems: "center", borderStyle: "dashed" },
  dateTabSelected: { borderColor: colors.ink, backgroundColor: colors.ink + "11", borderStyle: "solid" },
  dateTabLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "88" },
  dateTabLabelSelected: { fontFamily: "Kalam_700Bold", color: colors.ink },
  tomorrowNotice: { backgroundColor: colors.ink + "11", borderRadius: 8, padding: 10, marginBottom: 14 },
  tomorrowNoticeText: { fontFamily: "Kalam_700Bold", fontSize: 15, color: colors.ink },
  tomorrowNoticeReason: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.ink + "99", marginTop: 2 },
  slotNote: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77", marginBottom: 10 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: colors.pencil + "33", borderStyle: "dashed" },
  slotBtnSelected: { borderColor: colors.accent, backgroundColor: colors.accent + "15", borderStyle: "solid" },
  slotLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  slotLabelSelected: { fontFamily: "Kalam_700Bold", color: colors.accent },
  // Summary
  summaryTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryItem: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99" },
  summaryAmt: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: colors.pencil + "33", borderStyle: "dashed", paddingTop: 10, marginTop: 6 },
  totalLabel: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  totalAmt: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.accent },
  // Checkout bar
  checkoutBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: 2.5, borderTopColor: colors.pencil, backgroundColor: colors.paper },
});
