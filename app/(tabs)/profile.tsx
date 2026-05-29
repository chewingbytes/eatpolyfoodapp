import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth";
import { useVendorStore } from "../../store/vendor";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { colors, wobbly } from "../../lib/theme";

export default function ProfileScreen() {
  const { session, user, signOut } = useAuthStore();
  const { isVendor, store } = useVendorStore();

  console.log("ISVENDOR:", isVendor);

  async function handleSignOut() {
    Alert.alert("Sign out?", "See you next time! 👋", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await signOut(); router.replace("/(tabs)"); } },
    ]);
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.guestHero}>
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>not signed in</Text>
          <Text style={styles.guestSubtitle}>sign in to track orders & get collection reminders</Text>
          <View style={styles.dashedLine} />
        </View>
        <View style={styles.guestBtns}>
          <HandButton label="Sign In →" onPress={() => router.push("/(auth)/login")} fullWidth variant="primary" />
          <View style={{ height: 12 }} />
          <HandButton label="Create Account" onPress={() => router.push("/(auth)/signup")} fullWidth variant="secondary" />
        </View>
        <Text style={styles.footer}>✏️ FoodAtPoly · Skip the queue at your poly canteen</Text>
      </View>
    );
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Student";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Avatar card — tilted slightly */}
      <View style={styles.avatarSection}>
        <View style={{ transform: [{ rotate: "-2deg" }] }}>
          <WobblyCard style={styles.avatarCard} decoration="tape" bg={colors.postit}>
            <View style={styles.avatarInner}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {isVendor && (
                <View style={styles.vendorBadge}>
                  <Text style={styles.vendorBadgeText}>🏪 Vendor</Text>
                </View>
              )}
            </View>
          </WobblyCard>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuSection}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/orders")} activeOpacity={0.75}>
          <WobblyCard style={styles.menuItem}>
            <View style={styles.menuRow}>
              <View style={[styles.menuIcon, { backgroundColor: colors.ink + "22" }]}>
                <Ionicons name="receipt-outline" size={22} color={colors.ink} />
              </View>
              <Text style={styles.menuLabel}>My Orders</Text>
              <Text style={styles.menuArrow}>→</Text>
            </View>
          </WobblyCard>
        </TouchableOpacity>

        {/* Vendor shortcut — only visible to vendors */}
        {isVendor && (
          <TouchableOpacity onPress={() => router.push("/vendor")} activeOpacity={0.75}>
            <WobblyCard style={styles.menuItem}>
              <View style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: colors.green + "22" }]}>
                  <Ionicons name="storefront-outline" size={22} color={colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>Manage My Store</Text>
                  {store?.name ? (
                    <Text style={styles.menuSub}>{store.name}</Text>
                  ) : null}
                </View>
                <Text style={styles.menuArrow}>→</Text>
              </View>
            </WobblyCard>
          </TouchableOpacity>
        )}
      </View>

      {/* Sign out */}
      <View style={styles.signOutSection}>
        <HandButton label="Sign Out" onPress={handleSignOut} fullWidth variant="secondary" />
      </View>

      <Text style={styles.footer}>✏️ FoodAtPoly · Pre-order at Singapore Polys</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 24, paddingTop: 60, alignItems: "center" },
  // Guest
  guestHero: { alignItems: "center", marginBottom: 32 },
  guestEmoji: { fontSize: 72, marginBottom: 16 },
  guestTitle: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.pencil, marginBottom: 8 },
  guestSubtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", textAlign: "center" },
  dashedLine: { marginTop: 20, width: "70%", borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "44" },
  guestBtns: { width: "100%", paddingHorizontal: 8 },
  // Logged-in
  scrollContainer: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { padding: 24, paddingBottom: 48 },
  avatarSection: { marginBottom: 28 },
  avatarCard: { padding: 0 },
  avatarInner: { alignItems: "center", padding: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.ink + "22",
    borderWidth: 3,
    borderColor: colors.pencil,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitial: { fontFamily: "Kalam_700Bold", fontSize: 36, color: colors.ink },
  displayName: { fontFamily: "Kalam_700Bold", fontSize: 24, color: colors.pencil },
  email: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "77", marginTop: 4 },
  menuSection: { gap: 12, marginBottom: 24 },
  menuItem: {},
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil },
  menuArrow: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil + "66" },
  menuSub: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77", marginTop: 1 },
  vendorBadge: {
    marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: colors.greenLight,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.green,
  },
  vendorBadgeText: { fontFamily: "Kalam_700Bold", fontSize: 15, color: "#15803d" },
  signOutSection: { marginBottom: 32 },
  footer: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.muted, textAlign: "center" },
});
