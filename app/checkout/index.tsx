import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { initStripe, useStripe } from "@stripe/stripe-react-native";
import { useCartStore } from "../../store/cart";
import { useAuthStore } from "../../store/auth";
import { supabase } from "../../lib/supabase";
import { registerForPushNotifications, scheduleLocalOrderNotification } from "../../lib/notifications";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { colors } from "../../lib/theme";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

function formatCollectionTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-SG", {
      timeZone: "Asia/Singapore",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CheckoutScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { collectionTime } = useLocalSearchParams<{ collectionTime: string }>();
  const { items, totalCents, clearCart } = useCartStore();
  const userId = useAuthStore((s) => s.user?.id);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => { initSheet(); }, []);

  async function initSheet() {
    setLoading(true);
    try {
      await initStripe({ publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "" });
      pushTokenRef.current = await registerForPushNotifications();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          items: items.map((i) => ({ name: i.name, qty: i.qty, priceInCents: i.priceInCents })),
          collectionTime,
          storeId: items[0]?.storeId,
          storeName: items[0]?.storeName,
          expoPushToken: pushTokenRef.current ?? undefined,
          userId: userId ?? undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Failed to create payment");
      }
      const { clientSecret } = await response.json();
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "FoodAtPoly",
        returnURL: "polyfoodapp://stripe-redirect",
        style: "alwaysLight",
        primaryButtonLabel: "Confirm PayNow Payment",
        allowsDelayedPaymentMethods: true,
      });
      if (error) throw new Error(error.message);
      setReady(true);
    } catch (e: any) {
      Alert.alert("Payment setup failed", e.message, [{ text: "Go back", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    setLoading(true);
    const { error } = await presentPaymentSheet();
    setLoading(false);
    if (error) {
      if (error.code !== "Canceled") Alert.alert("Payment failed", JSON.stringify(error, null, 2));
      console.log(JSON.stringify(error, null, 2))
      return;
    }
    if (collectionTime) {
      await scheduleLocalOrderNotification(new Date(collectionTime)).catch(() => {});
    }
    clearCart();
    router.replace("/checkout/success");
  }

  const total = totalCents();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Order summary — post-it style */}
        <WobblyCard bg={colors.postit} decoration="tape" style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📋 your order</Text>
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

        {/* Collection details */}
        <WobblyCard style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>📦 collection details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏱️</Text>
            <Text style={styles.detailText}>{formatCollectionTime(collectionTime)}</Text>
          </View>
        </WobblyCard>

        {/* PayNow info */}
        <WobblyCard style={styles.paynowCard} bg={colors.ink + "11"}>
          <Text style={styles.paynowTitle}>📱 how PayNow works</Text>
          <Text style={styles.paynowText}>
            After tapping pay, a QR code appears.{"\n"}Scan it with your banking app — your order is confirmed instantly!
          </Text>
        </WobblyCard>
      </ScrollView>

      <View style={styles.payBar}>
        {loading && !ready ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>preparing payment…</Text>
          </View>
        ) : (
          <HandButton
            label={ready ? `Pay $${(total / 100).toFixed(2)} with PayNow →` : "Loading…"}
            onPress={handlePay}
            disabled={!ready || loading}
            variant="danger"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 16, paddingBottom: 20 },
  summaryCard: { padding: 16 },
  summaryTitle: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryItem: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99" },
  summaryAmt: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: colors.pencil + "44", borderStyle: "dashed", paddingTop: 10, marginTop: 6 },
  totalLabel: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  totalAmt: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.accent },
  detailsCard: { padding: 16 },
  detailsTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  detailIcon: { fontSize: 20 },
  detailText: { fontFamily: "PatrickHand_400Regular", fontSize: 17, color: colors.pencil },
  paynowCard: { padding: 16 },
  paynowTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.ink, marginBottom: 8 },
  paynowText: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.ink + "cc", lineHeight: 22 },
  payBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 2.5, borderTopColor: colors.pencil, backgroundColor: colors.paper },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 14 },
  loadingText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },
});
