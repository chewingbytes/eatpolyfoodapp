import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sanityFetch } from "../../lib/sanity";
import { FOOD_PRODUCT_QUERY, type FoodProduct } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { ErrorView } from "../../components/ErrorView";
import { useCartStore } from "../../store/cart";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  useEffect(() => {
    if (!slug) return;
    sanityFetch<FoodProduct>(FOOD_PRODUCT_QUERY, { slug })
      .then((data) => {
        setProduct(data);
        if (data?.name) navigation.setOptions({ title: data.name });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingView />;
  if (error || !product) return <ErrorView message={error ?? "Not found"} />;

  function handleAddToCart() {
    if (!product?.store) return;
    const currentStoreId = cartItems[0]?.storeId;
    if (currentStoreId && currentStoreId !== product.store._id) {
      Alert.alert("Different stall!", "Your cart has items from another stall. Clear & add this?", [
        { text: "Cancel", style: "cancel" },
        { text: "Clear & Add ✓", style: "destructive", onPress: doAdd },
      ]);
    } else {
      doAdd();
    }
  }

  function doAdd() {
    if (!product?.store) return;
    addItem({ id: product._id, name: product.name, priceInCents: Math.round(product.price * 100), qty, storeId: product.store._id, storeName: product.store.name });
    Alert.alert("Added! 🛒", `${qty}× ${product.name} added to cart.`);
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image — slight rotation for hand-placed feel */}
        <View style={styles.imageWrap}>
          <SanityImage url={product.image?.asset?.url} style={styles.image as any} />
        </View>

        <View style={styles.body}>
          {/* Dietary badges */}
          <View style={styles.badgeRow}>
            {product.isHalal && <StickyBadge label="✅ Halal" bg="#dcfce7" color="#15803d" rotate="-1deg" />}
            {product.isVegetarian && <StickyBadge label="🥦 Veg" bg="#ecfdf5" color="#059669" rotate="1deg" />}
            {(product.spicyLevel ?? 0) > 0 && (
              <StickyBadge label={"🌶".repeat(product.spicyLevel!)} bg="#fff7ed" color="#ea580c" rotate="-0.5deg" />
            )}
          </View>

          {/* Name + price */}
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>

          {product.store && (
            <Text style={styles.storeLabel}>
              from {product.store.name}{product.store.canteen ? ` · ${product.store.canteen.name}` : ""}
            </Text>
          )}

          {product.description && <Text style={styles.description}>{product.description}</Text>}

          {product.preparationTime && (
            <View style={styles.prepRow}>
              <Ionicons name="time-outline" size={16} color={colors.pencil + "66"} />
              <Text style={styles.prepText}>~{product.preparationTime} min prep</Text>
            </View>
          )}

          <View style={styles.dashedLine} />
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        {/* Qty selector */}
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>qty</Text>
          <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
            <Ionicons name="remove" size={18} color={colors.pencil} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty((q) => q + 1)} style={[styles.qtyBtn, styles.qtyBtnAdd]}>
            <Ionicons name="add" size={18} color={colors.paper} />
          </TouchableOpacity>
        </View>

        <HandButton
          label={`Add to Cart · $${(product.price * qty).toFixed(2)} →`}
          onPress={handleAddToCart}
          variant="danger"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  imageWrap: { overflow: "hidden" },
  image: { width: "100%", height: 280 },
  body: { padding: 20 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  productName: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.pencil, marginBottom: 4 },
  productPrice: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.ink, marginBottom: 6 },
  storeLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77" },
  description: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "99", lineHeight: 24, marginTop: 12 },
  prepRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  prepText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "55" },
  dashedLine: { borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "22", marginTop: 16 },
  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 2.5, borderTopColor: colors.pencil, backgroundColor: colors.paper, gap: 12 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyLabel: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil, flex: 1 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.pencil, alignItems: "center", justifyContent: "center" },
  qtyBtnAdd: { backgroundColor: colors.pencil },
  qtyText: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil, minWidth: 28, textAlign: "center" },
});
