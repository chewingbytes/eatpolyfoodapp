/**
 * Vendor Dashboard — Home
 *
 * Shows the vendor's store info and quick-action tiles.
 * Large text and big touch targets for older users.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth";
import { useVendorStore } from "../../store/vendor";
import { sanityFetch } from "../../lib/sanity";
import {
  VENDOR_STORE_QUERY,
  VENDOR_PRODUCTS_QUERY,
  VENDOR_ADD_ON_GROUPS_QUERY,
  type VendorStore,
  type VendorProduct,
  type VendorAddOnGroup,
} from "../../lib/groq";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { SanityImage } from "../../components/SanityImage";
import { colors } from "../../lib/theme";

export default function VendorDashboard() {
  const { user, session } = useAuthStore();
  const {
    store, setStore, setProducts, setAddOnGroups,
    products, addOnGroups,
  } = useVendorStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const email = user?.email ?? "";

  async function loadAll() {
    if (!email) return;
    try {
      const sanityStore = await sanityFetch<VendorStore>(VENDOR_STORE_QUERY, { email });
      if (!sanityStore) {
        Alert.alert(
          "Store not found",
          "No store is linked to your email. Please contact the admin.",
          [{ text: "OK" }]
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setStore(sanityStore);

      const [prods, groups] = await Promise.all([
        sanityFetch<VendorProduct[]>(VENDOR_PRODUCTS_QUERY, { storeId: sanityStore._id }),
        sanityFetch<VendorAddOnGroup[]>(VENDOR_ADD_ON_GROUPS_QUERY, { storeId: sanityStore._id }),
      ]);
      setProducts(prods ?? []);
      setAddOnGroups(groups ?? []);
    } catch (e) {
      Alert.alert("Error", "Could not load your store. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadAll(); }, [email]);

  useFocusEffect(
    useCallback(() => {
      if (store) {
        // Refresh products + groups when coming back to dashboard
        Promise.all([
          sanityFetch<VendorProduct[]>(VENDOR_PRODUCTS_QUERY, { storeId: store._id }),
          sanityFetch<VendorAddOnGroup[]>(VENDOR_ADD_ON_GROUPS_QUERY, { storeId: store._id }),
        ]).then(([prods, groups]) => {
          setProducts(prods ?? []);
          setAddOnGroups(groups ?? []);
        }).catch(() => {});
      }
    }, [store?._id])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>loading your store...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🏪</Text>
        <Text style={styles.errorTitle}>No store linked</Text>
        <Text style={styles.errorBody}>
          Your account ({email}) is not linked to any store.
          {"\n"}Please contact your admin.
        </Text>
      </View>
    );
  }

  const availableCount = products.filter((p) => p.isAvailable).length;
  const activeGroupCount = addOnGroups.filter((g) => g.isActive).length;
  const locationParts = [
    store.stallNumber,
    store.canteen?.name,
    store.canteen?.polytechnic?.shortName,
  ].filter(Boolean).join(" · ");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadAll(); }}
          tintColor={colors.accent}
        />
      }
    >
      {/* ── Store card ── */}
      <WobblyCard style={styles.storeCard} decoration="tape" bg={colors.postit}>
        {store.image?.asset?.url ? (
          <View style={styles.storeImageWrap}>
            <SanityImage url={store.image.asset.url} style={styles.storeImage} />
          </View>
        ) : null}
        <Text style={styles.storeName}>{store.name}</Text>
        {!!locationParts && (
          <Text style={styles.storeLocation}>📍 {locationParts}</Text>
        )}
        {store.cuisine && (
          <Text style={styles.storeCuisine}>{store.cuisine}</Text>
        )}
      </WobblyCard>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <WobblyCard style={styles.statCard} bg="#e0f2fe">
          <Text style={styles.statNum}>{availableCount}</Text>
          <Text style={styles.statLabel}>items{"\n"}on menu</Text>
        </WobblyCard>
        <WobblyCard style={styles.statCard} bg="#dcfce7">
          <Text style={styles.statNum}>{products.length - availableCount}</Text>
          <Text style={styles.statLabel}>items{"\n"}hidden</Text>
        </WobblyCard>
        <WobblyCard style={styles.statCard} bg={colors.postit}>
          <Text style={styles.statNum}>{activeGroupCount}</Text>
          <Text style={styles.statLabel}>add-on{"\n"}groups</Text>
        </WobblyCard>
      </View>

      {/* ── Action tiles ── */}
      <Text style={styles.sectionTitle}>what would you like to do?</Text>

      <ActionTile
        emoji="🍱"
        title="Manage Menu"
        subtitle={`${products.length} items · tap to show / hide`}
        bg="#e0f2fe"
        onPress={() => router.push("/vendor/products")}
      />

      <ActionTile
        emoji="➕"
        title="Manage Add-ons"
        subtitle={`${addOnGroups.length} groups · sizes, extras & more`}
        bg="#fef9c3"
        onPress={() => router.push("/vendor/add-ons")}
      />
    </ScrollView>
  );
}

// ── Action tile component ─────────────────────────────────────────────────────

function ActionTile({
  emoji, title, subtitle, bg, onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.tileOuter}>
      <WobblyCard style={styles.tile} bg={bg}>
        <View style={styles.tileInner}>
          <Text style={styles.tileEmoji}>{emoji}</Text>
          <View style={styles.tileText}>
            <Text style={styles.tileTitle}>{title}</Text>
            <Text style={styles.tileSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={28} color={colors.pencil + "66"} />
        </View>
      </WobblyCard>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 14, paddingBottom: 48 },

  center: {
    flex: 1, backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center",
    padding: 32, gap: 12,
  },
  loadingText: { fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil + "88" },
  errorEmoji: { fontSize: 64 },
  errorTitle: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  errorBody: {
    fontFamily: "PatrickHand_400Regular", fontSize: 17,
    color: colors.pencil + "88", textAlign: "center", lineHeight: 26,
  },

  // Store card
  storeCard: { padding: 16, gap: 6 },
  storeImageWrap: {
    width: "100%", height: 160,
    borderRadius: 14, overflow: "hidden", marginBottom: 8,
  },
  storeImage: { width: "100%", height: "100%", borderRadius: 12 },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  storeLocation: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },
  storeCuisine: {
    fontFamily: "PatrickHand_400Regular", fontSize: 14,
    color: colors.pencil + "66", textTransform: "capitalize",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, padding: 14, alignItems: "center", gap: 4 },
  statNum: { fontFamily: "Kalam_700Bold", fontSize: 32, color: colors.pencil },
  statLabel: {
    fontFamily: "PatrickHand_400Regular", fontSize: 13,
    color: colors.pencil + "88", textAlign: "center", lineHeight: 18,
  },

  sectionTitle: {
    fontFamily: "Kalam_700Bold", fontSize: 20,
    color: colors.pencil, marginTop: 4,
  },

  // Action tiles
  tileOuter: {},
  tile: { padding: 20 },
  tileInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  tileEmoji: { fontSize: 40 },
  tileText: { flex: 1, gap: 4 },
  tileTitle: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.pencil },
  tileSubtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },
});
