import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sanityFetch } from "../../lib/sanity";
import { STORE_QUERY, type StoreWithProducts, type FoodProduct } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { ErrorView } from "../../components/ErrorView";
import { useCartStore } from "../../store/cart";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

function getDefaultPriceCents(product: FoodProduct): number {
  if (product.portionOptions && product.portionOptions.length > 0) {
    const def = product.portionOptions.find((o) => o.isDefault) ?? product.portionOptions[0];
    return def.priceInCents;
  }
  return product.price ? Math.round(product.price * 100) : 0;
}

function ProductRow({ product, storeId, storeName }: { product: FoodProduct; storeId: string; storeName: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const cartItem = cartItems.find((i) => i.id === product._id);
  const priceCents = getDefaultPriceCents(product);
  const hasMultiplePortions = (product.portionOptions?.length ?? 0) > 1;

  function handleAdd() {
    const currentStoreId = cartItems[0]?.storeId;
    if (currentStoreId && currentStoreId !== storeId) {
      Alert.alert(
        "Different stall!",
        "Your cart has items from another stall. Clear it and add this?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear & Add ✓", style: "destructive", onPress: () => addItem({ id: product._id, name: product.name, priceInCents: priceCents, qty: 1, storeId, storeName }) },
        ]
      );
    } else {
      addItem({ id: product._id, name: product.name, priceInCents: priceCents, qty: 1, storeId, storeName });
    }
  }

  return (
    <TouchableOpacity onPress={() => router.push(`/products/${product.slug}`)} style={styles.productRow} activeOpacity={0.8}>
      <View style={styles.productInfo}>
        {/* Dietary badges */}
        <View style={styles.badgeRow}>
          {product.isHalal && <StickyBadge label="HALAL" bg="#dcfce7" color="#15803d" rotate="-0.5deg" style={styles.badge} />}
          {product.isVegetarian && <StickyBadge label="VEG" bg="#ecfdf5" color="#059669" rotate="0.5deg" style={styles.badge} />}
          {(product.spicyLevel ?? 0) > 0 && <StickyBadge label={"🌶".repeat(product.spicyLevel!)} bg="#fff7ed" color="#ea580c" rotate="-1deg" style={styles.badge} />}
        </View>
        <Text style={styles.productName}>{product.name}</Text>
        {product.description && <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>}
        {product.preparationTime && <Text style={styles.productPrepTime}>⏱ ~{product.preparationTime} min</Text>}
        <Text style={styles.productPrice}>{hasMultiplePortions ? "from " : ""}${(priceCents / 100).toFixed(2)}</Text>
      </View>
      <View style={styles.productRight}>
        <View style={styles.productImageWrap}>
          <SanityImage url={product.image?.asset?.url} style={styles.productImage as any} />
        </View>
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, cartItem ? styles.addBtnFilled : {}]}>
          {cartItem ? (
            <Text style={styles.addBtnQty}>{cartItem.qty}</Text>
          ) : (
            <Ionicons name="add" size={20} color={colors.paper} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<StoreWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalQty = useCartStore((s) => s.totalQty());
  const totalCents = useCartStore((s) => s.totalCents());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  async function fetchData() {
    try {
      const result = await sanityFetch<StoreWithProducts>(STORE_QUERY, { slug });
      setData(result);
      console.log("SETDATA:", JSON.stringify(result, null, 2));
      if (result?.name) navigation.setOptions({ title: result.name });
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { if (slug) fetchData(); }, [slug]);

  // Unique categories derived from the product list, preserving order
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: { _id: string; name: string; emoji?: string | null }[] = [];
    for (const p of data?.products ?? []) {
      const cat = p.category;
      if (cat?._id && !seen.has(cat._id)) {
        seen.add(cat._id);
        list.push({ _id: cat._id, name: cat.name, emoji: cat.emoji });
      }
    }
    return list;
  }, [data?.products]);

  const filteredProducts = useMemo(() => {
    const all = data?.products ?? [];
    if (!activeCategory) return all;
    return all.filter((p) => p.category?._id === activeCategory);
  }, [data?.products, activeCategory]);

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error ?? "Not found"} onRetry={fetchData} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: totalQty > 0 ? 100 : 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <SanityImage url={data.image?.asset?.url} style={styles.storeHeroImage as any} />
            <View style={styles.storeInfo}>
              <View style={styles.storeInfoHeader}>
                <View style={styles.storeInfoText}>
                  <Text style={styles.storeName}>{data.name}</Text>
                  {data.cuisine && <Text style={styles.storeCuisine}>{data.cuisine}</Text>}
                </View>
                {data.stallNumber && (
                  <StickyBadge label={`Stall ${data.stallNumber}`} bg={colors.postit} rotate="2deg" />
                )}
              </View>
              {data.description && <Text style={styles.storeDesc}>{data.description}</Text>}
              <View style={styles.dashedLine} />
            </View>
            {/* Category filter chips — only shown when there are 2+ categories */}
            {categories.length > 1 && (
              <View style={styles.chipSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  <TouchableOpacity
                    style={[styles.chip, !activeCategory && styles.chipActive]}
                    onPress={() => setActiveCategory(null)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={[styles.chip, activeCategory === cat._id && styles.chipActive]}
                      onPress={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.chipText, activeCategory === cat._id && styles.chipTextActive]}
                        numberOfLines={1}
                      >
                        {cat.emoji ? `${cat.emoji} ` : ""}{cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ProductRow product={item} storeId={data._id} storeName={data.name} />
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>no items available</Text></View>}
      />

      {totalQty > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/cart")} style={styles.cartBtn} activeOpacity={0.85}>
            <View style={styles.cartQtyBadge}>
              <Text style={styles.cartQtyText}>{totalQty}</Text>
            </View>
            <Text style={styles.cartBtnLabel}>View Cart</Text>
            <Text style={styles.cartBtnTotal}>${(totalCents / 100).toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  // Store header
  storeHeroImage: { width: "100%", height: 200 },
  storeInfo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, backgroundColor: colors.paper },
  storeInfoHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  storeInfoText: { flex: 1 },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  storeCuisine: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  storeDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99", marginTop: 8, lineHeight: 22 },
  dashedLine: { borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "33", marginTop: 14 },
  // Category chip filter
  chipSection: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.pencil + "11",
  },
  chipRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.pencil + "44",
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil },
  chipTextActive: { color: "#fff", fontFamily: "Kalam_700Bold" },
  // Product row
  productRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: colors.pencil + "11", backgroundColor: colors.paper },
  productInfo: { flex: 1, paddingRight: 8 },
  badgeRow: { flexDirection: "row", gap: 4, marginBottom: 5, flexWrap: "wrap" },
  badge: {},
  productName: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil },
  productDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77", lineHeight: 20, marginTop: 2 },
  productPrepTime: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.pencil + "55", marginTop: 4 },
  productPrice: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.ink, marginTop: 6 },
  productRight: { alignItems: "center", gap: 8 },
  productImageWrap: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: colors.muted, overflow: "hidden" },
  productImage: { width: "100%", height: "100%", borderRadius: 10 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pencil, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.pencil },
  addBtnFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  addBtnQty: { fontFamily: "Kalam_700Bold", fontSize: 15, color: colors.paper },
  // Cart bar
  cartBar: { position: "absolute", bottom: 24, left: 20, right: 20 },
  cartBtn: {
    backgroundColor: colors.pencil,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: colors.pencil,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  cartQtyBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  cartQtyText: { fontFamily: "Kalam_700Bold", fontSize: 14, color: colors.paper },
  cartBtnLabel: { flex: 1, fontFamily: "Kalam_700Bold", fontSize: 17, color: colors.paper, textAlign: "center" },
  cartBtnTotal: { fontFamily: "Kalam_700Bold", fontSize: 17, color: colors.paper },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "66" },
});
