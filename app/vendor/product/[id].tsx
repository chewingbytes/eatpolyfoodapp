/**
 * Vendor Edit Product Screen
 *
 * Allows vendor to edit a single product's key fields:
 * availability, recommended flag, price (or portion prices), and tags.
 * Large text and big touch targets for older users.
 */
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../../store/auth";
import { useVendorStore } from "../../../store/vendor";
import { vendorPatch } from "../../../lib/sanity";
import { WobblyCard } from "../../../components/ui/WobblyCard";
import { SanityImage } from "../../../components/SanityImage";
import { colors } from "../../../lib/theme";

const ALL_TAGS = [
  { key: "bestseller", label: "⭐ Bestseller" },
  { key: "new",        label: "🆕 New" },
  { key: "limited",    label: "⏳ Limited" },
  { key: "chefs-special", label: "👨‍🍳 Chef's Special" },
  { key: "popular",   label: "🔥 Popular" },
  { key: "value",     label: "💰 Good Value" },
  { key: "healthy",   label: "🌿 Healthy" },
  { key: "seasonal",  label: "🎉 Seasonal" },
];

export default function VendorEditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { products, setProducts } = useVendorStore();

  const product = useMemo(() => products.find((p) => p._id === id), [products, id]);

  // ── Local editable state ──────────────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isRecommended, setIsRecommended] = useState(product?.isRecommended ?? false);
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [saving, setSaving] = useState(false);

  // Portion prices (if product uses portions)
  const [portionPrices, setPortionPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    product?.portionOptions?.forEach((p) => {
      map[p._key] = (p.priceInCents / 100).toFixed(2);
    });
    return map;
  });

  // Single price (if no portions)
  const [singlePrice, setSinglePrice] = useState(
    product?.price != null ? product.price.toFixed(2) : ""
  );

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  function toggleTag(key: string) {
    setTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      const set: Record<string, unknown> = {
        isAvailable,
        isRecommended,
        tags,
      };

      // Price updates
      if (product.portionOptions?.length) {
        // Patch each portion price
        product.portionOptions.forEach((opt) => {
          const raw = portionPrices[opt._key];
          const cents = Math.round(parseFloat(raw || "0") * 100);
          if (!isNaN(cents) && cents > 0) {
            set[`portionOptions[_key == "${opt._key}"].priceInCents`] = cents;
          }
        });
      } else if (singlePrice) {
        const price = parseFloat(singlePrice);
        if (!isNaN(price) && price > 0) {
          set.price = price;
        }
      }

      await vendorPatch(session.access_token, product._id, { set });

      // Update local store state
      setProducts(
        products.map((p) =>
          p._id === product._id
            ? { ...p, isAvailable, isRecommended, tags }
            : p
        )
      );

      router.replace("/vendor/products")
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const priceText = product.portionOptions?.length
    ? `from $${(Math.min(...product.portionOptions.map((o) => o.priceInCents)) / 100).toFixed(2)}`
    : product.price != null
    ? `$${product.price.toFixed(2)}`
    : "no price set";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Product header ── */}
        <WobblyCard style={styles.headerCard} decoration="tape">
          {product.image?.asset?.url ? (
            <View style={styles.imageWrap}>
              <SanityImage url={product.image.asset.url} style={styles.image} />
            </View>
          ) : null}
          <Text style={styles.productName}>{product.name}</Text>
          {product.description ? (
            <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
          ) : null}
          <Text style={styles.productCurrentPrice}>current price: {priceText}</Text>
        </WobblyCard>

        {/* ── Availability toggle ── */}
        <WobblyCard style={styles.section}>
          <Text style={styles.sectionTitle}>🔆 Show on menu?</Text>
          <Text style={styles.sectionHint}>
            Turn OFF to temporarily hide this item (e.g. sold out today).
          </Text>
          <View style={styles.bigToggleRow}>
            <Text style={[styles.bigToggleLabel, !isAvailable && styles.offText]}>
              {isAvailable ? "✅ Showing" : "❌ Hidden"}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.muted, true: "#86efac" }}
              thumbColor={isAvailable ? "#16a34a" : colors.pencil + "55"}
              ios_backgroundColor={colors.muted}
              style={styles.bigSwitch}
            />
          </View>
        </WobblyCard>

        {/* ── Recommended toggle ── */}
        <WobblyCard style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Recommend this item?</Text>
          <Text style={styles.sectionHint}>
            Recommended items appear on the home screen for all students.
          </Text>
          <View style={styles.bigToggleRow}>
            <Text style={[styles.bigToggleLabel, !isRecommended && styles.offText]}>
              {isRecommended ? "⭐ Yes, recommend it" : "Not featured"}
            </Text>
            <Switch
              value={isRecommended}
              onValueChange={setIsRecommended}
              trackColor={{ false: colors.muted, true: "#fde68a" }}
              thumbColor={isRecommended ? "#d97706" : colors.pencil + "55"}
              ios_backgroundColor={colors.muted}
              style={styles.bigSwitch}
            />
          </View>
        </WobblyCard>

        {/* ── Price editing ── */}
        <WobblyCard style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Update Price (SGD)</Text>
          {product.portionOptions?.length ? (
            <>
              <Text style={styles.sectionHint}>Edit the price for each size option.</Text>
              {product.portionOptions.map((opt) => (
                <View key={opt._key} style={styles.portionRow}>
                  <Text style={styles.portionLabel}>{opt.label}</Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={portionPrices[opt._key]}
                      onChangeText={(v) =>
                        setPortionPrices((prev) => ({ ...prev, [opt._key]: v }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.pencil + "44"}
                    />
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionHint}>Enter the price in dollars (e.g. 3.50).</Text>
              <View style={styles.portionRow}>
                <Text style={styles.portionLabel}>Price</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={singlePrice}
                    onChangeText={setSinglePrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.pencil + "44"}
                  />
                </View>
              </View>
            </>
          )}
        </WobblyCard>

        {/* ── Tags ── */}
        <WobblyCard style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Item Labels</Text>
          <Text style={styles.sectionHint}>Tap to add or remove labels from this item.</Text>
          <View style={styles.tagGrid}>
            {ALL_TAGS.map((t) => {
              const active = tags.includes(t.key);
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() => toggleTag(t.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </WobblyCard>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.82}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Changes ✅"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  errorText: { fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil + "88" },

  headerCard: { padding: 16, gap: 6 },
  imageWrap: { width: "100%", height: 160, borderRadius: 14, overflow: "hidden", marginBottom: 8 },
  image: { width: "100%", height: "100%", borderRadius: 12 },
  productName: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  productDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },
  productCurrentPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.accent },

  section: { padding: 18, gap: 10 },
  sectionTitle: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  sectionHint: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "88", lineHeight: 22 },

  bigToggleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 4,
    backgroundColor: colors.paper,
    borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: colors.muted,
  },
  bigToggleLabel: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil, flex: 1 },
  offText: { color: colors.pencil + "66" },
  bigSwitch: { transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] },

  portionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12,
  },
  portionLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil, flex: 1 },
  priceInputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 2.5, borderColor: colors.pencil,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.white, gap: 4,
  },
  dollarSign: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  priceInput: {
    fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil,
    minWidth: 70, textAlign: "right",
  },

  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tagChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 2, borderColor: colors.muted,
    backgroundColor: colors.white,
  },
  tagChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tagText: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil },
  tagTextActive: { color: colors.white, fontFamily: "Kalam_700Bold" },

  saveBtn: {
    backgroundColor: colors.pencil, padding: 20,
    borderRadius: 18, alignItems: "center",
    marginTop: 4,
    shadowColor: colors.pencil,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.white },
});
