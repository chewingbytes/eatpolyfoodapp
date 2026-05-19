import React, { useState } from "react";
import {
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
import { WobblyCard } from "../../components/ui/WobblyCard";
import { WobblyInput } from "../../components/ui/WobblyInput";
import { HandButton } from "../../components/ui/HandButton";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors, wobblyMd } from "../../lib/theme";

type CollectionTime = "asap" | "30m" | "1h" | "2h";

const COLLECTION_OPTIONS: { value: CollectionTime; label: string; emoji: string }[] = [
  { value: "asap", label: "ASAP (~15 min)", emoji: "🔥" },
  { value: "30m", label: "In ~30 min", emoji: "⏰" },
  { value: "1h", label: "In ~1 hour", emoji: "🕐" },
  { value: "2h", label: "In ~2 hours", emoji: "🕑" },
];

export default function CartScreen() {
  const { items, removeItem, updateQty, totalCents } = useCartStore();
  const [studentName, setStudentName] = useState("");
  const [collectionTime, setCollectionTime] = useState<CollectionTime>("asap");

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
    if (!studentName.trim()) {
      Alert.alert("Name required! ✏️", "Please enter your name so the stall knows who to call");
      return;
    }
    router.push({ pathname: "/checkout", params: { studentName: studentName.trim(), collectionTime } });
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
                <Text style={styles.itemPrice}>${(item.priceInCents / 100).toFixed(2)} each</Text>
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
            {/* Student name */}
            <WobblyCard style={styles.sectionCard} decoration="tape">
              <Text style={styles.sectionTitle}>📝 your name</Text>
              <WobblyInput
                placeholder="e.g. Ahmad — so the stall can call you!"
                value={studentName}
                onChangeText={setStudentName}
                autoComplete="name"
              />
            </WobblyCard>

            {/* Collection time */}
            <WobblyCard style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⏱️ when to collect?</Text>
              <View style={styles.timeOptions}>
                {COLLECTION_OPTIONS.map((opt) => {
                  const selected = collectionTime === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setCollectionTime(opt.value)}
                      style={[
                        styles.timeOption,
                        selected && styles.timeOptionSelected,
                      ]}
                    >
                      <Text style={styles.timeEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.timeLabel, selected && styles.timeLabelSelected]}>
                        {opt.label}
                      </Text>
                      {selected && (
                        <View style={styles.timeTick}>
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
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
  itemPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.ink, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.pencil, alignItems: "center", justifyContent: "center" },
  qtyBtnAdd: { backgroundColor: colors.pencil },
  qtyText: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil, minWidth: 20, textAlign: "center" },
  removeBtn: { marginLeft: 4, padding: 4 },
  // Footer sections
  footer: { gap: 16, marginTop: 8 },
  sectionCard: { padding: 16 },
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, marginBottom: 12 },
  // Time options
  timeOptions: { gap: 8 },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.pencil + "44",
    borderRadius: 10,
    borderStyle: "dashed",
  },
  timeOptionSelected: {
    borderColor: colors.pencil,
    borderStyle: "solid",
    backgroundColor: colors.pencil + "08",
  },
  timeEmoji: { fontSize: 20 },
  timeLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "99", flex: 1 },
  timeLabelSelected: { color: colors.pencil, fontFamily: "Kalam_700Bold" },
  timeTick: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
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
