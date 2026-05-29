import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { sanityFetch } from "../../lib/sanity";
import { ALL_CANTEENS_QUERY, type Canteen } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { colors } from "../../lib/theme";

export default function BrowseScreen() {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSchool, setActiveSchool] = useState<string | null>(null);

  async function fetchData() {
    try {
      const data = await sanityFetch<Canteen[]>(ALL_CANTEENS_QUERY);
      setCanteens(data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Unique schools derived from the canteen list
  const schools = useMemo(() => {
    const seen = new Set<string>();
    const list: { _id: string; name: string; shortName: string; color?: string }[] = [];
    for (const c of canteens) {
      const poly = c.polytechnic;
      if (poly?._id && !seen.has(poly._id)) {
        seen.add(poly._id);
        list.push({ _id: poly._id, name: poly.name, shortName: poly.shortName, color: poly.color });
      }
    }
    return list;
  }, [canteens]);

  // Filter canteens by selected school
  const filtered = useMemo(() => {
    if (!activeSchool) return canteens;
    return canteens.filter((c) => c.polytechnic?._id === activeSchool);
  }, [canteens, activeSchool]);

  if (loading) return <LoadingView />;

  return (
    <View style={styles.container}>
      {/* -- School filter ----------------------------------------- */}
      {schools.length > 1 && (
        <View style={styles.chipSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <TouchableOpacity
              style={[styles.chip, !activeSchool && styles.chipActive]}
              onPress={() => setActiveSchool(null)}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.chipText, !activeSchool && styles.chipTextActive]}
                numberOfLines={1}
              >
                🏫 All
              </Text>
            </TouchableOpacity>

            {schools.map((s) => (
              <TouchableOpacity
                key={s._id}
                style={[
                  styles.chip,
                  activeSchool === s._id && styles.chipActive,
                  s.color && activeSchool !== s._id ? { borderColor: s.color + "88" } : {},
                ]}
                onPress={() => setActiveSchool(activeSchool === s._id ? null : s._id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeSchool === s._id && styles.chipTextActive,
                    s.color && activeSchool !== s._id ? { color: s.color } : {},
                  ]}
                  numberOfLines={1}
                >
                  {s.shortName ?? s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* -- Canteen list ------------------------------------------ */}
      <FlatList
        style={styles.flatList}
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <WobblyCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>no canteens found 🍽️</Text>
          </WobblyCard>
        }
        renderItem={({ item, index }) => {
          const rotate = ["-0.8deg", "0.6deg", "-1.2deg", "0.8deg", "0deg"][index % 5];
          const polyColor = item.polytechnic?.color;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/canteens/${item.slug}` as any)}
              style={{ transform: [{ rotate }] }}
            >
              <WobblyCard style={styles.card}>
                {/* Image / placeholder */}
                <View style={styles.imageWrap}>
                  {item.image?.asset?.url ? (
                    <SanityImage url={item.image.asset.url} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderEmoji}>🏫</Text>
                    </View>
                  )}
                  {item.polytechnic && (
                    <View
                      style={[
                        styles.polyBadge,
                        polyColor ? { backgroundColor: polyColor } : {},
                      ]}
                    >
                      <Text style={styles.polyBadgeText}>
                        {item.polytechnic.shortName ?? item.polytechnic.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>

                  <View style={styles.metaRow}>
                    {item.location ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        📍 {item.location}
                      </Text>
                    ) : null}
                    {item.storeCount != null && item.storeCount > 0 ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {item.storeCount} {item.storeCount === 1 ? "stall" : "stalls"}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {item.openingHours ? (
                    <Text style={styles.hours} numberOfLines={1}>
                      🕐 {item.openingHours}
                    </Text>
                  ) : null}

                  <Text style={styles.cta}>browse stalls →</Text>
                </View>
              </WobblyCard>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  flatList: { flex: 1 },

  // Chip section: View owns the height so ScrollView inside cannot escape it.
  chipSection: {
    height: 56,
    flexShrink: 0,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: colors.pencil + "11",
  },
  chipRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.pencil + "44",
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 14,
    color: colors.pencil,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Kalam_700Bold",
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },

  // No padding — image bleeds to card edges
  card: { padding: 0, overflow: "hidden" },

  // Image container owns the clip + top corner radii.
  // Inner radii = wobblyLg (32, 12) minus borderWidth (2.5).
  imageWrap: {
    width: "100%",
    height: 140,
    overflow: "hidden",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 10,
    backgroundColor: colors.muted,
  },
  image: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 10,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderEmoji: { fontSize: 40 },

  polyBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.pencil,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  polyBadgeText: {
    fontFamily: "Kalam_700Bold",
    fontSize: 11,
    color: "#fff",
  },

  info: { padding: 14, gap: 4 },
  name: { fontFamily: "Kalam_700Bold", fontSize: 17, color: colors.pencil },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil + "88",
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 3,
  },
  countBadgeText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 11,
    color: colors.pencil + "99",
  },
  hours: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil + "88",
  },
  cta: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
    textAlign: "right",
  },

  emptyCard: { padding: 32, alignItems: "center" },
  emptyText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 16,
    color: colors.pencil + "88",
  },
});
