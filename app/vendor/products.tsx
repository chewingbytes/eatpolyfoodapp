/**
 * Vendor Products Screen
 *
 * Shows all products for the vendor's store.
 * Vendors can toggle availability on/off with one tap.
 * Large text and toggle targets for older users.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth";
import { useVendorStore } from "../../store/vendor";
import { vendorPatch } from "../../lib/sanity";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { SanityImage } from "../../components/SanityImage";
import type { VendorProduct } from "../../lib/groq";
import { colors } from "../../lib/theme";

export default function VendorProductsScreen() {
  const { session } = useAuthStore();
  const { products, store, toggleProductAvailable } = useVendorStore();
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");

  // Group by category
  const categories = Array.from(
    new Map(
      products
        .filter((p) => p.category)
        .map((p) => [p.category!._id, p.category!])
    ).values()
  );
  const uncategorised = products.filter((p) => !p.category);

  // Apply availability filter
  function applyFilter(list: VendorProduct[]) {
    if (filter === "on") return list.filter((p) => p.isAvailable);
    if (filter === "off") return list.filter((p) => !p.isAvailable);
    return list;
  }

  async function handleToggle(product: VendorProduct) {
    if (!session?.access_token) return;
    if (toggling) return; // Prevent double-tap
    setToggling(product._id);
    // Optimistic update
    toggleProductAvailable(product._id);
    try {
      await vendorPatch(session.access_token, product._id, {
        set: { isAvailable: !product.isAvailable },
      });
    } catch (e) {
      // Revert optimistic update
      toggleProductAvailable(product._id);
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[vendorPatch error]", msg);
      Alert.alert("Error", msg);
    } finally {
      setToggling(null);
    }
  }

  function renderProduct({ item }: { item: VendorProduct }) {
    const priceText = item.portionOptions?.length
      ? `from $${(Math.min(...item.portionOptions.map((o) => o.priceInCents)) / 100).toFixed(2)}`
      : item.price != null
      ? `$${item.price.toFixed(2)}`
      : "";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/vendor/product/${item._id}`)}
        activeOpacity={0.82}
      >
        <WobblyCard style={[styles.productCard, !item.isAvailable && styles.productCardOff]}>
          <View style={styles.productRow}>
            {/* Thumbnail */}
            {item.image?.asset?.url ? (
              <View style={styles.thumbWrap}>
                <SanityImage url={item.image.asset.url} style={styles.thumb} />
                {!item.isAvailable && <View style={styles.thumbOverlay} />}
              </View>
            ) : (
              <View style={[styles.thumbWrap, styles.thumbPlaceholder]}>
                <Text style={styles.thumbEmoji}>🍽️</Text>
              </View>
            )}

            {/* Info */}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, !item.isAvailable && styles.productNameOff]}
                numberOfLines={2}>
                {item.name}
              </Text>
              {!!priceText && (
                <Text style={styles.productPrice}>{priceText}</Text>
              )}
              <View style={styles.badgeRow}>
                {item.isHalal && <Text style={styles.badge}>☪️ halal</Text>}
                {item.isVegetarian && <Text style={styles.badge}>🌿 veg</Text>}
              </View>
            </View>

            {/* Toggle */}
            <View style={styles.switchWrap}>
              {toggling === item._id ? (
                <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
              ) : (
                <Switch
                  value={item.isAvailable}
                  onValueChange={() => handleToggle(item)}
                  disabled={!!toggling}
                  trackColor={{ false: colors.muted, true: "#86efac" }}
                  thumbColor={item.isAvailable ? "#16a34a" : colors.pencil + "55"}
                  ios_backgroundColor={colors.muted}
                />
              )}
              <Text style={[styles.switchLabel, item.isAvailable ? styles.onLabel : styles.offLabel]}>
                {item.isAvailable ? "ON" : "OFF"}
              </Text>
            </View>
          </View>
        </WobblyCard>
      </TouchableOpacity>
    );
  }

  // Build sections list
  const allSections: { title: string; emoji: string; data: VendorProduct[] }[] = [
    ...categories.map((cat) => ({
      title: cat.name,
      emoji: cat.emoji ?? "🍽️",
      data: applyFilter(products.filter((p) => p.category?._id === cat._id)),
    })),
    ...(uncategorised.length > 0
      ? [{ title: "Other", emoji: "🍽️", data: applyFilter(uncategorised) }]
      : []),
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(["all", "on", "off"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === "all" ? "all items" : f === "on" ? "✅ showing" : "❌ hidden"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={allSections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.emoji} {section.title}</Text>
            </View>
            {section.data.map((product) => (
              <View key={product._id}>
                {renderProduct({ item: product })}
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>no items match this filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 16, paddingBottom: 48, gap: 6 },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderRadius: 12, borderWidth: 2, borderColor: colors.muted,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil },
  chipTextActive: { color: colors.white, fontFamily: "Kalam_700Bold" },

  sectionHeader: { paddingVertical: 10 },
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },

  productCard: { padding: 14, marginBottom: 2 },
  productCardOff: { opacity: 0.65 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  thumbWrap: {
    width: 72, height: 72, borderRadius: 12,
    overflow: "hidden", borderWidth: 2, borderColor: colors.muted,
    backgroundColor: colors.muted,
  },
  thumb: { width: "100%", height: "100%", borderRadius: 10 },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    opacity: 0.35,
    borderRadius: 10,
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbEmoji: { fontSize: 28 },

  productInfo: { flex: 1, gap: 4 },
  productName: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, lineHeight: 24 },
  productNameOff: { color: colors.pencil + "77" },
  productPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.accent },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.pencil + "88" },

  switchWrap: { alignItems: "center", gap: 4, minWidth: 52 },
  spinner: { height: 31 },
  switchLabel: { fontFamily: "Kalam_700Bold", fontSize: 13 },
  onLabel: { color: "#16a34a" },
  offLabel: { color: colors.pencil + "66" },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil + "88" },
});
