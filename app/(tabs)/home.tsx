import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { sanityFetch } from "../../lib/sanity";
import { ALL_POLYTECHNICS_QUERY, ALL_STORES_QUERY, type Polytechnic, type Store } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { colors, wobblyMd } from "../../lib/theme";
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

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [polytechnics, setPolytechnics] = useState<Polytechnic[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const [polys, storeData] = await Promise.all([
        sanityFetch<Polytechnic[]>(ALL_POLYTECHNICS_QUERY),
        sanityFetch<Store[]>(ALL_STORES_QUERY),
      ]);
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

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "friend";

  return (
    <FlatList
      data={stores}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>hey, {firstName}! 👋</Text>
            <Text style={styles.greetingSubtitle}>what are you craving today?</Text>
          </View>

          {/* Browse by school */}
          <Text style={styles.sectionTitle}>📍 browse by school</Text>
          <FlatList
            data={polytechnics}
            keyExtractor={(p) => p._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.polyRow}
            renderItem={({ item: poly }) => (
              <TouchableOpacity
                style={[styles.polyChip, poly.color ? { backgroundColor: poly.color + "22", borderColor: poly.color + "66" } : {}]}
                onPress={() => router.push(`/polytechnics/${poly.slug}`)}
                activeOpacity={0.75}
              >
                <Text style={[styles.polyChipText, poly.color ? { color: poly.color } : {}]}>
                  {poly.shortName ?? poly.name}
                </Text>
              </TouchableOpacity>
            )}
          />

          <Text style={styles.sectionTitle}>🏪 all stores</Text>
        </>
      }
      renderItem={({ item: store, index }) => {
        const rotate = ["-1deg", "1deg", "-0.5deg", "0.5deg", "-1.5deg"][index % 5];
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/stores/${store.slug}`)}
          >
            <WobblyCard style={[styles.storeCard, { transform: [{ rotate }] }]} decoration="corner">
              <View style={styles.storeCardInner}>
                {store.image?.asset?.url ? (
                  <SanityImage
                    url={store.image.asset.url}
                    width={80}
                    height={80}
                    style={styles.storeThumb}
                  />
                ) : (
                  <View style={[styles.storeThumb, styles.storeThumbPlaceholder]}>
                    <Text style={styles.storeThumbEmoji}>{getCuisineEmoji(store.cuisine)}</Text>
                  </View>
                )}
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  {store.cuisine ? (
                    <Text style={styles.storeCuisine}>{getCuisineEmoji(store.cuisine)} {store.cuisine}</Text>
                  ) : null}
                  {store.stallNumber ? (
                    <Text style={styles.storeStall}>Stall #{store.stallNumber}</Text>
                  ) : null}
                  {(store as any).canteen?.name ? (
                    <Text style={styles.storeLocation}>📍 {(store as any).canteen.name}</Text>
                  ) : null}
                </View>
              </View>
            </WobblyCard>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <WobblyCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>no stores found yet 🍽️</Text>
        </WobblyCard>
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: colors.paper,
  },
  greeting: {
    marginBottom: 20,
  },
  greetingText: {
    fontFamily: "Kalam_700Bold",
    fontSize: 28,
    color: colors.pencil,
  },
  greetingSubtitle: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 16,
    color: colors.pencil + "88",
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Kalam_700Bold",
    fontSize: 18,
    color: colors.pencil,
    marginBottom: 10,
    marginTop: 4,
  },
  polyRow: {
    gap: 8,
    paddingBottom: 16,
  },
  polyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.pencil + "44",
    backgroundColor: colors.paper,
    ...wobblyMd,
  },
  polyChipText: {
    fontFamily: "Kalam_700Bold",
    fontSize: 14,
    color: colors.pencil,
  },
  storeCard: {
    marginBottom: 12,
    padding: 12,
  },
  storeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  storeThumbPlaceholder: {
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  storeThumbEmoji: {
    fontSize: 28,
  },
  storeInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontFamily: "Kalam_700Bold",
    fontSize: 16,
    color: colors.pencil,
  },
  storeCuisine: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil + "99",
    textTransform: "capitalize",
  },
  storeStall: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.ink,
  },
  storeLocation: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.pencil + "77",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 16,
    color: colors.pencil + "88",
  },
});
