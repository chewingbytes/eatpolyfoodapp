import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { sanityFetch } from "../../lib/sanity";
import {
  ACTIVE_PROMOTIONS_QUERY,
  ALL_POLYTECHNICS_QUERY,
  ALL_STORES_QUERY,
  RECOMMENDED_PRODUCTS_QUERY,
  type FoodProductBrowse,
  type Polytechnic,
  type Promotion,
  type Store,
} from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HeroCarousel } from "../../components/ui/HeroCarousel";
import { ProductSheet } from "../../components/ProductSheet";
import { colors } from "../../lib/theme";
import { useAuthStore } from "../../store/auth";

const CUISINE_EMOJIS: Record<string, string> = {
  chinese: "🥢", malay: "🍛", indian: "🌶️", western: "🍔",
  japanese: "🍱", korean: "🍜", thai: "🥘", vegetarian: "🥗",
  beverages: "🧋", halal: "☪️", mixed: "🍽️",
};

function getCuisineEmoji(cuisine?: string) {
  if (!cuisine) return "🍽️";
  const key = cuisine.toLowerCase();
  return Object.entries(CUISINE_EMOJIS).find(([k]) => key.includes(k))?.[1] ?? "🍽️";
}

function getMinPrice(p: FoodProductBrowse): number {
  if (p.portionOptions?.length) {
    return Math.min(...p.portionOptions.map((o) => o.priceInCents)) / 100;
  }
  return p.price;
}

const TAG_LABEL: Record<string, string> = {
  bestseller: "⭐", new: "🆕", limited: "⏳", "chefs-special": "👨‍🍳",
  popular: "🔥", value: "💰", healthy: "🌿", seasonal: "🎉",
};

// ── Sticky-note section label ─────────────────────────────────────────────
function SectionLabel({
  emoji,
  text,
  action,
  onAction,
}: {
  emoji: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={slStyles.row}>
      <View style={slStyles.label}>
        <Text style={slStyles.labelText}>{emoji} {text}</Text>
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={slStyles.action}>{action} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const slStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
  label: {
    backgroundColor: colors.postit,
    paddingHorizontal: 12,
    paddingVertical: 5,
    transform: [{ rotate: "-1.2deg" }],
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.pencil + "33",
  },
  labelText: {
    fontFamily: "Kalam_700Bold",
    fontSize: 15,
    color: colors.pencil,
  },
  action: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 14,
    color: colors.ink,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [recommended, setRecommended] = useState<FoodProductBrowse[]>([]);
  const [polytechnics, setPolytechnics] = useState<Polytechnic[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FoodProductBrowse | null>(null);

  async function fetchData() {
    try {
      const [promos, recs, polys, storeData] = await Promise.all([
        sanityFetch<Promotion[]>(ACTIVE_PROMOTIONS_QUERY),
        sanityFetch<FoodProductBrowse[]>(RECOMMENDED_PRODUCTS_QUERY),
        sanityFetch<Polytechnic[]>(ALL_POLYTECHNICS_QUERY),
        sanityFetch<Store[]>(ALL_STORES_QUERY),
      ]);
      setPromotions(promos ?? []);
      setRecommended(recs ?? []);
      setPolytechnics(polys ?? []);
      setStores(storeData ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingView />;

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "friend";

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── Greeting header — notepad page style ────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.greetingHey}>hey, {firstName}! 👋</Text>
          <Text style={styles.greetingCrave}>what are you craving today?</Text>
          {/* Pencil-ruled dashed line at the bottom of the header */}
          <View style={styles.headerRule} />
        </View>

        {promotions.length > 0 && (
          <View style={styles.carouselWrap}>
            <HeroCarousel
              items={promotions}
              onPress={(promo) => {
                if (promo.storeSlug) router.push(`/stores/${promo.storeSlug}` as any);
              }}
            />
          </View>
        )}

        {/* ── Recommended ─────────────────────────────────────────── */}
        {recommended.length > 0 && (
          <>
            <SectionLabel
              emoji=""
              text="recommended"
              action="see all"
              onAction={() => router.push("/(tabs)/" as any)}
            />
            <FlatList
              data={recommended}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item, index }) => {
                const rotate = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "0deg"][index % 5];
                const minPrice = getMinPrice(item);
                const topTag = item.tags?.[0];
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedProduct(item)}
                    activeOpacity={0.85}
                    style={{ transform: [{ rotate }] }}
                  >
                    <WobblyCard style={styles.recCard} decoration="none">
                      <View style={styles.recImageWrap}>
                        {item.image?.asset?.url ? (
                          <SanityImage url={item.image.asset.url} style={styles.recImage} />
                        ) : (
                          <View style={[styles.recImage, styles.recImagePlaceholder]}>
                            <Text style={{ fontSize: 36 }}>
                              {item.category?.emoji ?? "🍽️"}
                            </Text>
                          </View>
                        )}
                        {topTag && (
                          <View style={styles.recTagBadge}>
                            <Text style={styles.recTagBadgeText}>{TAG_LABEL[topTag] ?? topTag}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.recInfo}>
                        <Text style={styles.recName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.recStore} numberOfLines={1}>
                          📍 {item.store?.name}
                        </Text>
                        <View style={styles.recFooter}>
                          <Text style={styles.recPrice}>
                            {item.portionOptions?.length ? "from " : ""}${minPrice.toFixed(2)}
                          </Text>
                          <View style={styles.recDietRow}>
                            {item.isHalal && <Text style={styles.recDiet}>☪️</Text>}
                            {item.isVegetarian && <Text style={styles.recDiet}>🥗</Text>}
                          </View>
                        </View>
                      </View>
                    </WobblyCard>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* ── Deals & Promos ──────────────────────────────────────── */}
        {promotions.length > 0 && (
          <>
            <SectionLabel emoji="🏷️" text="deals & promos" />
            <FlatList
              data={promotions}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => item.storeSlug && router.push(`/stores/${item.storeSlug}` as any)}
                  activeOpacity={0.85}
                >
                  <WobblyCard
                    style={styles.promoCard}
                    bg={item.bgColor ?? colors.postit}
                    decoration="tape"
                  >
                    {item.image?.asset?.url ? (
                      <SanityImage url={item.image.asset.url} style={styles.promoImage} />
                    ) : null}
                    <View style={styles.promoContent}>
                      {item.badge && (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <Text style={styles.promoTitle} numberOfLines={2}>{item.title}</Text>
                      {item.subtitle && (
                        <Text style={styles.promoSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                      )}
                      {/* Coupon dashed edge */}
                      <View style={styles.couponEdge} />
                      <Text style={styles.promoTap}>tap to redeem →</Text>
                    </View>
                  </WobblyCard>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* ── Browse by school ────────────────────────────────────── */}
        {polytechnics.length > 0 && (
          <>
            <SectionLabel emoji="📍" text="browse by school" />
            <FlatList
              data={polytechnics}
              keyExtractor={(p) => p._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item: poly, index }) => {
                const chipRotate = ["-2deg", "1deg", "-1deg", "2deg", "0.5deg"][index % 5];
                const chipBg = poly.color ?? colors.pencil;
                return (
                  <TouchableOpacity
                    style={[
                      styles.polyChip,
                      { backgroundColor: chipBg, borderColor: chipBg },
                      { transform: [{ rotate: chipRotate }] },
                    ]}
                    onPress={() => router.push(`/polytechnics/${poly.slug}` as any)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.polyChipText}>
                      {poly.shortName ?? poly.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* ── All stores ──────────────────────────────────────────── */}
        <SectionLabel emoji="🏪" text="all stores" />

        {stores.map((store, index) => {
          const rotate = ["-1deg", "1deg", "-0.5deg", "0.5deg", "-1.5deg"][index % 5];
          return (
            <TouchableOpacity
              key={store._id}
              activeOpacity={0.85}
              style={[styles.storeOuter, { transform: [{ rotate }] }]}
              onPress={() => router.push(`/stores/${store.slug}` as any)}
            >
              <WobblyCard style={styles.storeCard}>
                <View style={styles.storeCardInner}>
                  {/* Picture-frame thumbnail */}
                  {store.image?.asset?.url ? (
                    <View style={styles.storeThumbFrame}>
                      <SanityImage url={store.image.asset.url} style={styles.storeThumb} />
                    </View>
                  ) : (
                    <View style={[styles.storeThumbFrame, styles.storeThumbPlaceholder]}>
                      <Text style={styles.storeThumbEmoji}>{getCuisineEmoji(store.cuisine)}</Text>
                    </View>
                  )}

                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.cuisine ? (
                      <Text style={styles.storeCuisine}>
                        {getCuisineEmoji(store.cuisine)} {store.cuisine}
                      </Text>
                    ) : null}
                    <View style={styles.storePills}>
                      {store.stallNumber ? (
                        <View style={styles.storePill}>
                          <Text style={styles.storePillText}>stall #{store.stallNumber}</Text>
                        </View>
                      ) : null}
                      {(store as any).canteen?.name ? (
                        <View style={[styles.storePill, styles.storePillBlue]}>
                          <Text style={[styles.storePillText, { color: colors.ink }]}>
                            📍 {(store as any).canteen.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.storeArrow}>›</Text>
                </View>
              </WobblyCard>
            </TouchableOpacity>
          );
        })}

        {stores.length === 0 && (
          <WobblyCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>no stores found yet 🍽️</Text>
          </WobblyCard>
        )}
      </ScrollView>

      <ProductSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },

  // ── Greeting header ──────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  greetingHey: {
    fontFamily: "Kalam_700Bold",
    fontSize: 30,
    color: colors.pencil,
    lineHeight: 38,
  },
  greetingCrave: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 17,
    color: colors.pencil + "77",
    marginTop: 2,
  },
  headerRule: {
    marginTop: 14,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.pencil + "28",
  },

  // ── Carousel wrapper ─────────────────────────────────────────────────────
  carouselWrap: {
    marginTop: 16,
  },

  // ── Shared horizontal scroll ─────────────────────────────────────────────
  hScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 6 },

  // ── Recommended cards ────────────────────────────────────────────────────
  recCard: { width: 158, padding: 0, overflow: "hidden" },
  // Wrapper owns clip + top corner radii so the image self-clips on both platforms.
  // Inner corner = outerRadius (wobblyLg) − borderWidth (2.5). topLeft: 32−2.5≈30, topRight: 12−2.5≈10.
  recImageWrap: {
    height: 120,
    overflow: "hidden",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 10,
  },
  recImage: { width: "100%", height: 120 },
  recImagePlaceholder: {
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  recTagBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#FAF5F1",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recTagBadgeText: { fontSize: 12 },
  recInfo: { padding: 10, gap: 3 },
  recName: { fontFamily: "Kalam_700Bold", fontSize: 14, color: colors.pencil, lineHeight: 20 },
  recStore: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.pencil + "77" },
  recFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  recPrice: { fontFamily: "Kalam_700Bold", fontSize: 14, color: colors.accent },
  recDietRow: { flexDirection: "row", gap: 2 },
  recDiet: { fontSize: 13 },

  // ── Promo / deals cards ──────────────────────────────────────────────────
  promoCard: { width: 240, overflow: "hidden", padding: 0 },
  promoImage: { width: 240, height: 110 },
  promoContent: { padding: 12, gap: 4 },
  promoBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 3,
  },
  promoBadgeText: { fontFamily: "Kalam_700Bold", fontSize: 11, color: "#fff" },
  promoTitle: { fontFamily: "Kalam_700Bold", fontSize: 15, color: colors.pencil },
  promoSubtitle: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.pencil + "88",
  },
  couponEdge: {
    marginTop: 6,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.pencil + "44",
  },
  promoTap: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.ink,
    textAlign: "right",
    marginTop: 4,
  },

  // ── School chips ─────────────────────────────────────────────────────────
  polyChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.pencil,
    // Hard mini shadow (iOS)
    shadowColor: colors.pencil,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  polyChipText: { fontFamily: "Kalam_700Bold", fontSize: 14, color: "#fff" },

  // ── Store cards ──────────────────────────────────────────────────────────
  storeOuter: { marginHorizontal: 20, marginBottom: 12 },
  storeCard: { padding: 12 },
  storeCardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  storeThumbFrame: {
    width: 74,
    height: 74,
    borderWidth: 2.5,
    borderColor: colors.pencil,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  storeThumb: {
    width: "100%",
    height: "100%",
    // Inner corner radii = storeThumbFrame radii − borderWidth (2.5).
    // Ensures the image self-clips on Android where parent overflow:hidden
    // doesn't reliably clip <Image> to rounded corners.
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 6,
  },
  storeThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  storeThumbEmoji: { fontSize: 28 },
  storeInfo: { flex: 1, gap: 3 },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.pencil },
  storeCuisine: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil + "88",
    textTransform: "capitalize",
  },
  storePills: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 },
  storePill: {
    backgroundColor: colors.muted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 3,
  },
  storePillBlue: { backgroundColor: colors.ink + "15" },
  storePillText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 11,
    color: colors.pencil + "99",
  },
  storeArrow: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil + "44" },

  emptyCard: { padding: 24, alignItems: "center", marginHorizontal: 20 },
  emptyText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88" },
});
