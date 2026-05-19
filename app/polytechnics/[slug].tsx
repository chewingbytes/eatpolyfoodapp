import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { sanityFetch } from "../../lib/sanity";
import { POLYTECHNIC_QUERY, type PolytechnicWithCanteens, type Canteen } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { ErrorView } from "../../components/ErrorView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { colors } from "../../lib/theme";

const ROTATIONS = ["-1deg", "0.8deg", "-0.5deg", "1.2deg"];

export default function PolytechnicScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<PolytechnicWithCanteens | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const result = await sanityFetch<PolytechnicWithCanteens>(POLYTECHNIC_QUERY, { slug });
      setData(result);
      if (result?.name) navigation.setOptions({ title: result.shortName ?? result.name });
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { if (slug) fetchData(); }, [slug]);

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error ?? "Not found"} onRetry={fetchData} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data.canteens}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <SanityImage url={data.image?.asset?.url} style={styles.headerImage as any} />
            <Text style={styles.headerTitle}>{data.name}</Text>
            {data.description && <Text style={styles.headerDesc}>{data.description}</Text>}
            <View style={styles.dashedLine} />
            <Text style={styles.sectionLabel}>pick a canteen below ↓</Text>
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>no canteens found</Text></View>}
        renderItem={({ item, index }: { item: Canteen; index: number }) => (
          <TouchableOpacity onPress={() => router.push(`/canteens/${item.slug}`)} activeOpacity={0.85}
            style={{ transform: [{ rotate: ROTATIONS[index % ROTATIONS.length] }] }}>
            <WobblyCard shadowSize={4}>
              <View style={styles.canteenRow}>
                <SanityImage url={item.image?.asset?.url} style={styles.canteenImage as any} />
                <View style={styles.canteenInfo}>
                  <Text style={styles.canteenName}>{item.name}</Text>
                  {item.location && <Text style={styles.canteenLocation}>📍 {item.location}</Text>}
                  {item.operatingHours && <Text style={styles.canteenHours}>🕐 {item.operatingHours}</Text>}
                  <Text style={styles.canteenCta}>see stalls →</Text>
                </View>
              </View>
            </WobblyCard>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { marginBottom: 8 },
  headerImage: { width: "100%", height: 180, borderRadius: 16, marginBottom: 16, borderWidth: 2.5, borderColor: colors.pencil },
  headerTitle: { fontFamily: "Kalam_700Bold", fontSize: 26, color: colors.pencil },
  headerDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "88", marginTop: 4 },
  dashedLine: { borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "33", marginVertical: 12 },
  sectionLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "66" },
  canteenRow: { flexDirection: "row", padding: 12, gap: 12, alignItems: "center" },
  canteenImage: { width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: colors.muted },
  canteenInfo: { flex: 1 },
  canteenName: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil },
  canteenLocation: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "88", marginTop: 2 },
  canteenHours: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "66", marginTop: 1 },
  canteenCta: { fontFamily: "Kalam_700Bold", fontSize: 13, color: colors.ink, marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "66" },
});
