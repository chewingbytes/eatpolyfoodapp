import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sanityFetch } from "../../lib/sanity";
import {
  FOOD_PRODUCT_QUERY,
  PRODUCT_ADD_ON_GROUPS_QUERY,
  type AddOnGroup,
  type FoodProduct,
} from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { ErrorView } from "../../components/ErrorView";
import { useCartStore } from "../../store/cart";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

type Selections = Record<string, string[]>;

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Add-on state
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [selections, setSelections] = useState<Selections>({});

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const [selectedPortionKey, setSelectedPortionKey] = useState<string | null>(null);

  const activePortion = product?.portionOptions?.find((o) => o._key === selectedPortionKey)
    ?? product?.portionOptions?.find((o) => o.isDefault)
    ?? product?.portionOptions?.[0];
  const priceCents = activePortion?.priceInCents ?? (product?.price ? Math.round(product.price * 100) : 0);

  // Sum add-on extras in cents
  const addOnCents = (() => {
    let total = 0;
    for (const g of addOnGroups) {
      for (const key of selections[g._id] ?? []) {
        total += g.options.find((o) => o._key === key)?.priceInCents ?? 0;
      }
    }
    return total;
  })();
  const totalPerItemCents = priceCents + addOnCents;

  useEffect(() => {
    if (!slug) return;
    sanityFetch<FoodProduct>(FOOD_PRODUCT_QUERY, { slug })
      .then((data) => {
        setProduct(data);
        if (data?.name) navigation.setOptions({ title: data.name });
        const def = data?.portionOptions?.find((o) => o.isDefault) ?? data?.portionOptions?.[0];
        if (def) setSelectedPortionKey(def._key);

        // Fetch add-on groups for this product
        if (data?.store?._id) {
          setLoadingAddOns(true);
          sanityFetch<AddOnGroup[]>(PRODUCT_ADD_ON_GROUPS_QUERY, {
            storeId: data.store._id,
            productId: data._id,
            categoryId: data.category?._id ?? "",
          })
            .then((groups) => {
              const valid = groups ?? [];
              setAddOnGroups(valid);
              // Pre-select defaults
              const init: Selections = {};
              for (const g of valid) {
                const defaults = g.options
                  .filter((o) => o.isDefault && o.isAvailable !== false)
                  .map((o) => o._key);
                init[g._id] = g.selectionType === "single" && defaults.length
                  ? [defaults[0]]
                  : defaults;
              }
              setSelections(init);
            })
            .catch(() => setAddOnGroups([]))
            .finally(() => setLoadingAddOns(false));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  function handleToggleOption(group: AddOnGroup, optionKey: string) {
    setSelections((prev) => {
      const current = prev[group._id] ?? [];
      if (group.selectionType === "single") {
        return { ...prev, [group._id]: [optionKey] };
      }
      const max = group.maxSelections ?? 0;
      if (current.includes(optionKey)) {
        return { ...prev, [group._id]: current.filter((k) => k !== optionKey) };
      }
      if (max > 0 && current.length >= max) {
        Alert.alert("Max reached", `You can only pick ${max} option${max > 1 ? "s" : ""} here.`);
        return prev;
      }
      return { ...prev, [group._id]: [...current, optionKey] };
    });
  }

  if (loading) return <LoadingView />;
  if (error || !product) return <ErrorView message={error ?? "Not found"} />;

  function handleAddToCart() {
    if (!product?.store) return;
    // Validate required add-on groups
    for (const group of addOnGroups) {
      const selected = selections[group._id] ?? [];
      const min = group.isRequired ? Math.max(group.minSelections ?? 1, 1) : (group.minSelections ?? 0);
      if (selected.length < min) {
        Alert.alert("Please choose", `"${group.name}" requires a selection.`);
        return;
      }
    }
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
    const hasPortions = (product.portionOptions?.length ?? 0) > 1;
    const baseId = hasPortions && activePortion ? `${product._id}:${activePortion._key}` : product._id;
    const cartName = hasPortions && activePortion ? `${product.name} (${activePortion.label})` : product.name;
    // Collect selected add-on names + prices for the cart breakdown
    const selectedAddOns = addOnGroups.flatMap((g) =>
      (selections[g._id] ?? [])
        .map((key) => g.options.find((o) => o._key === key))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ name: o.name, priceInCents: o.priceInCents }))
    );
    // Encode add-on keys into the cart id so different add-on combos are
    // separate line items and never merge with the wrong price.
    const addOnSuffix = Object.values(selections)
      .flat()
      .sort()
      .join(",");
    const cartId = addOnSuffix ? `${baseId}:${addOnSuffix}` : baseId;
    addItem({
      id: cartId,
      name: cartName,
      priceInCents: totalPerItemCents,
      basePriceInCents: priceCents,
      addOns: selectedAddOns.length ? selectedAddOns : undefined,
      qty,
      storeId: product.store._id,
      storeName: product.store.name,
    });
    router.back();
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
          <Text style={styles.productPrice}>
            {(product.portionOptions?.length ?? 0) > 1 && !activePortion ? "from " : ""}
            ${(priceCents / 100).toFixed(2)}
          </Text>

          {/* Portion picker */}
          {(product.portionOptions?.length ?? 0) > 1 && (
            <View style={styles.portionRow}>
              {product.portionOptions!.map((opt) => (
                <TouchableOpacity
                  key={opt._key}
                  onPress={() => setSelectedPortionKey(opt._key)}
                  style={[styles.portionBtn, selectedPortionKey === opt._key && styles.portionBtnActive]}
                >
                  <Text style={[styles.portionLabel, selectedPortionKey === opt._key && styles.portionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.portionPrice, selectedPortionKey === opt._key && styles.portionPriceActive]}>
                    ${(opt.priceInCents / 100).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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

          {/* Add-on groups */}
          {loadingAddOns ? (
            <View style={styles.addOnLoading}>
              <ActivityIndicator size="small" color={colors.pencil + "66"} />
              <Text style={styles.addOnLoadingText}>Loading options…</Text>
            </View>
          ) : (
            addOnGroups.map((group) => {
              const groupSel = selections[group._id] ?? [];
              const isMultiple = group.selectionType === "multiple";
              const maxLabel = isMultiple && group.maxSelections ? ` (max ${group.maxSelections})` : "";
              return (
                <View key={group._id} style={styles.addOnSection}>
                  <View style={styles.addOnHeader}>
                    <Text style={styles.addOnTitle}>{group.name}</Text>
                    <View style={styles.addOnMeta}>
                      {group.isRequired && (
                        <View style={styles.reqBadge}>
                          <Text style={styles.reqBadgeText}>Required</Text>
                        </View>
                      )}
                      <Text style={styles.addOnHint}>
                        {isMultiple ? `Pick any${maxLabel}` : "Pick one"}
                      </Text>
                    </View>
                  </View>
                  {group.description ? (
                    <Text style={styles.addOnDesc}>{group.description}</Text>
                  ) : null}
                  {group.options.map((opt) => {
                    const selected = groupSel.includes(opt._key);
                    const unavailable = opt.isAvailable === false;
                    return (
                      <TouchableOpacity
                        key={opt._key}
                        onPress={() => !unavailable && handleToggleOption(group, opt._key)}
                        style={[
                          styles.optionRow,
                          selected && styles.optionRowSelected,
                          unavailable && styles.optionRowDisabled,
                        ]}
                        activeOpacity={unavailable ? 1 : 0.75}
                      >
                        <View
                          style={[
                            styles.optionCheck,
                            isMultiple ? styles.optionCheckSquare : styles.optionCheckCircle,
                            selected && styles.optionCheckSelected,
                          ]}
                        >
                          {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
                        </View>
                        <View style={styles.optionTextCol}>
                          <Text style={[styles.optionName, unavailable && styles.optionNameDisabled]}>
                            {opt.name}{unavailable ? " (unavailable)" : ""}
                          </Text>
                          {opt.allergenNote ? (
                            <Text style={styles.optionAllergen}>⚠️ {opt.allergenNote}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.optionPrice, selected && styles.optionPriceSelected]}>
                          {opt.priceInCents === 0 ? "Free" : `+$${(opt.priceInCents / 100).toFixed(2)}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
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
          label={`Add to Cart · $${(totalPerItemCents * qty / 100).toFixed(2)} →`}
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
  portionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  portionBtn: { borderWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "55", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center", minWidth: 80 },
  portionBtnActive: { borderStyle: "solid", borderColor: colors.ink, backgroundColor: colors.ink + "11" },
  portionLabel: { fontFamily: "Kalam_700Bold", fontSize: 13, color: colors.pencil },
  portionLabelActive: { color: colors.ink },
  portionPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "99" },
  portionPriceActive: { color: colors.ink },
  // Add-on groups
  addOnLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  addOnLoadingText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "66" },
  addOnSection: { marginTop: 20, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.pencil + "22", paddingTop: 16 },
  addOnHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  addOnTitle: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil },
  addOnMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  addOnHint: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.pencil + "66" },
  addOnDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "88", marginBottom: 8 },
  reqBadge: { backgroundColor: colors.accent + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  reqBadgeText: { fontFamily: "Kalam_700Bold", fontSize: 10, color: colors.accent },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, marginTop: 4, gap: 10, borderWidth: 1.5, borderColor: colors.muted },
  optionRowSelected: { borderColor: colors.ink, backgroundColor: colors.ink + "0d" },
  optionRowDisabled: { opacity: 0.4 },
  optionCheck: { width: 18, height: 18, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.pencil + "55" },
  optionCheckCircle: { borderRadius: 9 },
  optionCheckSquare: { borderRadius: 3 },
  optionCheckSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionTextCol: { flex: 1, gap: 1 },
  optionName: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  optionNameDisabled: { color: colors.pencil + "55" },
  optionAllergen: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.accent },
  optionPrice: { fontFamily: "Kalam_700Bold", fontSize: 13, color: colors.pencil + "88" },
  optionPriceSelected: { color: colors.ink },
  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 2.5, borderTopColor: colors.pencil, backgroundColor: colors.paper, gap: 12 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyLabel: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil, flex: 1 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.pencil, alignItems: "center", justifyContent: "center" },
  qtyBtnAdd: { backgroundColor: colors.pencil },
  qtyText: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil, minWidth: 28, textAlign: "center" },
});
