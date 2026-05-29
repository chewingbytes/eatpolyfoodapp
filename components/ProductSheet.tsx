import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sanityFetch } from "../lib/sanity";
import {
  PRODUCT_ADD_ON_GROUPS_QUERY,
  type AddOnGroup,
  type FoodProductBrowse,
  type PortionOption,
} from "../lib/groq";
import { SanityImage } from "./SanityImage";
import { useCartStore } from "../store/cart";
import { colors, wobblyLg, wobblyMd } from "../lib/theme";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.88;

// ── Types ─────────────────────────────────────────────────────────

// selections: groupId -> array of selected option _key values
type Selections = Record<string, string[]>;

interface ProductSheetProps {
  product: FoodProductBrowse | null;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function effectivePrice(product: FoodProductBrowse, selectedPortion: string | null): number {
  if (product.portionOptions?.length) {
    const match = product.portionOptions.find((p) => p.label === selectedPortion);
    return (match?.priceInCents ?? product.portionOptions[0]?.priceInCents ?? 0) / 100;
  }
  return product.price;
}

function addOnTotal(groups: AddOnGroup[], selections: Selections): number {
  let cents = 0;
  for (const group of groups) {
    const selected = selections[group._id] ?? [];
    for (const key of selected) {
      const opt = group.options.find((o) => o._key === key);
      if (opt) cents += opt.priceInCents;
    }
  }
  return cents / 100;
}

function initSelections(groups: AddOnGroup[]): Selections {
  const init: Selections = {};
  for (const group of groups) {
    const defaults = group.options.filter((o) => o.isDefault && o.isAvailable !== false).map((o) => o._key);
    if (defaults.length) init[group._id] = group.selectionType === "single" ? [defaults[0]] : defaults;
    else init[group._id] = [];
  }
  return init;
}

// ── Component ─────────────────────────────────────────────────────

export function ProductSheet({ product, onClose }: ProductSheetProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [selections, setSelections] = useState<Selections>({});
  const [selectedPortion, setSelectedPortion] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Reset and fetch when product changes
  useEffect(() => {
    if (!product) return;
    setQty(1);
    setAddOnGroups([]);
    setSelections({});

    // Init default portion
    const portions = product.portionOptions ?? [];
    const defaultPortion = portions.find((p) => p.isDefault) ?? portions[0];
    setSelectedPortion(defaultPortion?.label ?? null);

    if (!product.store?._id) return;
    setLoadingAddOns(true);
    sanityFetch<AddOnGroup[]>(PRODUCT_ADD_ON_GROUPS_QUERY, {
      storeId: product.store._id,
      productId: product._id,
      categoryId: product.category?._id ?? "",
    })
      .then((groups) => {
        const validGroups = groups ?? [];
        setAddOnGroups(validGroups);
        setSelections(initSelections(validGroups));
      })
      .catch(() => {
        setAddOnGroups([]);
      })
      .finally(() => setLoadingAddOns(false));
  }, [product?._id]);

  const basePrice = useMemo(
    () => (product ? effectivePrice(product, selectedPortion) : 0),
    [product, selectedPortion]
  );
  const extrasPrice = useMemo(() => addOnTotal(addOnGroups, selections), [addOnGroups, selections]);
  const unitTotal = basePrice + extrasPrice;
  const grandTotal = unitTotal * qty;

  const handleToggleOption = useCallback(
    (group: AddOnGroup, optionKey: string) => {
      setSelections((prev) => {
        const current = prev[group._id] ?? [];
        if (group.selectionType === "single") {
          return { ...prev, [group._id]: [optionKey] };
        }
        // multiple
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
    },
    []
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    // Validate required groups
    for (const group of addOnGroups) {
      const selected = selections[group._id] ?? [];
      const min = group.isRequired ? Math.max(group.minSelections ?? 1, 1) : (group.minSelections ?? 0);
      if (selected.length < min) {
        Alert.alert("Please choose", `"${group.name}" requires a selection.`);
        return;
      }
    }

    const cartStoreId = cartItems[0]?.storeId;
    const doAdd = () => {
      // Collect selected add-ons for the cart breakdown
      const selectedAddOns = addOnGroups.flatMap((g) =>
        (selections[g._id] ?? [])
          .map((key) => g.options.find((o) => o._key === key))
          .filter((o): o is NonNullable<typeof o> => !!o)
          .map((o) => ({ name: o.name, priceInCents: o.priceInCents }))
      );
      // Encode add-on keys into the cart id so different combos are separate line items
      const addOnSuffix = Object.values(selections).flat().sort().join(",");
      const cartId = addOnSuffix ? `${product._id}:${addOnSuffix}` : product._id;
      const basePriceCents = Math.round(basePrice * 100);
      addItem({
        id: cartId,
        name: product.name,
        priceInCents: Math.round(unitTotal * 100),
        basePriceInCents: basePriceCents,
        addOns: selectedAddOns.length ? selectedAddOns : undefined,
        qty,
        storeId: product.store?._id ?? "",
        storeName: product.store?.name ?? "",
      });
      onClose();
    };

    if (cartStoreId && cartStoreId !== product.store?._id) {
      Alert.alert(
        "One Store Per Order",
        "Your cart has items from another store. Clear cart and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear & Add", style: "destructive", onPress: doAdd },
        ]
      );
    } else {
      doAdd();
    }
  }, [product, qty, unitTotal, addOnGroups, selections, cartItems]);

  if (!product) return null;

  const portions = product.portionOptions ?? [];
  const spicyStr = product.spicyLevel
    ? ["", "🌶️", "🌶️🌶️", "🌶️🌶️🌶️", "🌶️🌶️🌶️🌶️"][Math.min(product.spicyLevel, 4)]
    : "";

  const TAG_MAP: Record<string, string> = {
    bestseller: "⭐ Bestseller",
    new: "🆕 New",
    limited: "⏳ Limited",
    "chefs-special": "👨‍🍳 Chef's Special",
    popular: "🔥 Popular",
    value: "💰 Value Pick",
    healthy: "🌿 Healthy",
    seasonal: "🎉 Seasonal",
  };

  return (
    <Modal
      visible={!!product}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.pencil} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            bounces={false}
          >
            {/* Hero image */}
            {product.image?.asset?.url ? (
              <SanityImage
                url={product.image.asset.url}
                width={SCREEN_W}
                height={220}
                style={styles.heroImage}
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={styles.heroEmoji}>🍽️</Text>
              </View>
            )}

            <View style={styles.body}>
              {/* Tags */}
              {(product.tags?.length ?? 0) > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                  <View style={styles.tagRow}>
                    {product.tags!.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{TAG_MAP[tag] ?? tag}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Name + store */}
              <Text style={styles.productName}>{product.name}</Text>
              {product.store?.name ? (
                <Text style={styles.storeLine}>🏪 {product.store.name}</Text>
              ) : null}

              {/* Dietary badges */}
              <View style={styles.dietRow}>
                {product.isHalal && <View style={styles.dietBadge}><Text style={styles.dietText}>☪️ Halal</Text></View>}
                {product.isVegetarian && <View style={styles.dietBadge}><Text style={styles.dietText}>🥗 Veg</Text></View>}
                {product.isVegan && <View style={styles.dietBadge}><Text style={styles.dietText}>🌱 Vegan</Text></View>}
                {product.isGlutenFree && <View style={styles.dietBadge}><Text style={styles.dietText}>🌾 GF</Text></View>}
                {product.containsNuts && <View style={[styles.dietBadge, styles.dietBadgeWarn]}><Text style={styles.dietTextWarn}>⚠️ Nuts</Text></View>}
                {spicyStr ? <View style={styles.dietBadge}><Text style={styles.dietText}>{spicyStr}</Text></View> : null}
                {product.calories ? <View style={styles.dietBadge}><Text style={styles.dietText}>{product.calories} kcal</Text></View> : null}
              </View>

              {/* Description */}
              {product.description ? (
                <Text style={styles.description}>{product.description}</Text>
              ) : null}

              {/* Portion / size picker */}
              {portions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📏 Choose a size</Text>
                  <View style={styles.portionGrid}>
                    {portions.map((p: PortionOption) => {
                      const selected = selectedPortion === p.label;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          onPress={() => setSelectedPortion(p.label)}
                          style={[styles.portionBtn, selected && styles.portionBtnSelected]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.portionLabel, selected && styles.portionLabelSelected]}>
                            {p.label}
                          </Text>
                          <Text style={[styles.portionPrice, selected && styles.portionPriceSelected]}>
                            ${(p.priceInCents / 100).toFixed(2)}
                          </Text>
                          {p.calories ? (
                            <Text style={styles.portionCal}>{p.calories} kcal</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
                  const maxLabel =
                    isMultiple && group.maxSelections
                      ? ` (max ${group.maxSelections})`
                      : "";
                  return (
                    <View key={group._id} style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{group.name}</Text>
                        <View style={styles.sectionMeta}>
                          {group.isRequired && (
                            <View style={styles.reqBadge}>
                              <Text style={styles.reqBadgeText}>Required</Text>
                            </View>
                          )}
                          <Text style={styles.sectionHint}>
                            {isMultiple ? `Pick any${maxLabel}` : "Pick one"}
                          </Text>
                        </View>
                      </View>
                      {group.description ? (
                        <Text style={styles.sectionDesc}>{group.description}</Text>
                      ) : null}

                      <View style={styles.optionList}>
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
                              <View style={styles.optionLeft}>
                                <View style={[
                                  styles.optionCheck,
                                  isMultiple ? styles.optionCheckSquare : styles.optionCheckCircle,
                                  selected && styles.optionCheckSelected,
                                ]}>
                                  {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
                                </View>
                                <View style={styles.optionTextCol}>
                                  <Text style={[styles.optionName, unavailable && styles.optionNameDisabled]}>
                                    {opt.name}
                                    {unavailable ? " (unavailable)" : ""}
                                  </Text>
                                  {opt.allergenNote ? (
                                    <Text style={styles.optionAllergen}>⚠️ {opt.allergenNote}</Text>
                                  ) : null}
                                  {opt.calories ? (
                                    <Text style={styles.optionCal}>{opt.calories > 0 ? `+${opt.calories}` : opt.calories} kcal</Text>
                                  ) : null}
                                </View>
                              </View>
                              <Text style={[styles.optionPrice, selected && styles.optionPriceSelected]}>
                                {opt.priceInCents === 0 ? "Free" : `+$${(opt.priceInCents / 100).toFixed(2)}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}

              {/* Spacer for sticky footer */}
              <View style={{ height: 100 }} />
            </View>
          </ScrollView>

          {/* Sticky footer */}
          <View style={styles.footer}>
            {/* Qty controls */}
            <View style={styles.qtyRow}>
              <TouchableOpacity
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                style={styles.qtyBtn}
              >
                <Ionicons name="remove" size={18} color={colors.pencil} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity
                onPress={() => setQty((q) => q + 1)}
                style={[styles.qtyBtn, styles.qtyBtnAdd]}
              >
                <Ionicons name="add" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>
                Add to Cart · ${grandTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const borderRadius = {
  borderTopLeftRadius: 28,
  borderTopRightRadius: 20,
  borderBottomRightRadius: 0,
  borderBottomLeftRadius: 0,
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  backdropTouch: { flex: 1 },
  sheet: {
    height: SHEET_H,
    backgroundColor: colors.paper,
    ...borderRadius,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.pencil + "33",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingBottom: 0 },

  heroImage: { width: "100%", height: 220 },
  heroPlaceholder: { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  heroEmoji: { fontSize: 64 },

  body: { padding: 18, gap: 12 },

  tagScroll: { marginHorizontal: -2 },
  tagRow: { flexDirection: "row", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.ink + "15",
    borderWidth: 1,
    borderColor: colors.ink + "33",
  },
  tagText: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.ink },

  productName: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  storeLine: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77" },

  dietRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dietBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  dietText: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: "#166534" },
  dietBadgeWarn: { backgroundColor: "#fef9c3", borderColor: "#fde047" },
  dietTextWarn: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: "#854d0e" },

  description: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 15,
    color: colors.pencil + "99",
    lineHeight: 22,
  },

  section: {
    gap: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.pencil + "15",
    paddingTop: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil },
  sectionMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionHint: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.pencil + "66" },
  sectionDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77", marginTop: -4 },

  reqBadge: {
    backgroundColor: colors.accent + "22",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.accent + "55",
  },
  reqBadgeText: { fontFamily: "PatrickHand_400Regular", fontSize: 11, color: colors.accent },

  // Portion picker
  portionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  portionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.pencil + "33",
    borderStyle: "dashed",
    alignItems: "center",
    minWidth: 90,
  },
  portionBtnSelected: {
    borderColor: colors.ink,
    borderStyle: "solid",
    backgroundColor: colors.ink + "11",
  },
  portionLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil },
  portionLabelSelected: { fontFamily: "Kalam_700Bold", color: colors.ink },
  portionPrice: { fontFamily: "Kalam_700Bold", fontSize: 15, color: colors.pencil },
  portionPriceSelected: { color: colors.ink },
  portionCal: { fontFamily: "PatrickHand_400Regular", fontSize: 11, color: colors.pencil + "66" },

  // Add-on options
  addOnLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  addOnLoadingText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "77" },

  optionList: { gap: 6 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.pencil + "22",
    backgroundColor: colors.white,
  },
  optionRowSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink + "0d",
  },
  optionRowDisabled: { opacity: 0.45 },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  optionCheck: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.pencil + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCheckCircle: { borderRadius: 10 },
  optionCheckSquare: { borderRadius: 4 },
  optionCheckSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionTextCol: { flex: 1, gap: 1 },
  optionName: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  optionNameDisabled: { color: colors.pencil + "55" },
  optionAllergen: { fontFamily: "PatrickHand_400Regular", fontSize: 11, color: "#854d0e" },
  optionCal: { fontFamily: "PatrickHand_400Regular", fontSize: 11, color: colors.pencil + "66" },
  optionPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  optionPriceSelected: { fontFamily: "Kalam_700Bold", color: colors.ink },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.paper,
    borderTopWidth: 2,
    borderTopColor: colors.pencil + "22",
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.pencil,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnAdd: { backgroundColor: colors.pencil },
  qtyText: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, minWidth: 24, textAlign: "center" },
  addBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: colors.pencil,
    ...wobblyMd,
  },
  addBtnText: { fontFamily: "Kalam_700Bold", fontSize: 17, color: "#fff" },
});
