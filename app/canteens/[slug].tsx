import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { sanityFetch } from "../../lib/sanity";
import { CANTEEN_QUERY, type CanteenWithStores, type Store } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { ErrorView } from "../../components/ErrorView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { StickyBadge } from "../../components/ui/StickyBadge";
import { colors } from "../../lib/theme";

const ROTATIONS = ["0.8deg", "-1deg", "1.2deg", "-0.5deg"];

export default function CanteenScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<CanteenWithStores | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const result = await sanityFetch<CanteenWithStores>(CANTEEN_QUERY, { slug });
      setData(result);
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

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error ?? "Not found"} onRetry={fetchData} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data.stores}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerImageWrap}>
              <SanityImage url={data.image?.asset?.url} style={styles.headerImage as any} />
            </View>
            <Text style={styles.headerTitle}>Stalls in {data.name}</Text>
            {data.location && <Text style={styles.headerLocation}>📍 {data.location}</Text>}
            <View style={styles.dashedLine} />
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>no stalls open right now</Text></View>}
        renderItem={({ item, index }: { item: Store; index: number }) => (
          <TouchableOpacity onPress={() => router.push(`/stores/${item.slug}`)} activeOpacity={0.85}
            style={{ transform: [{ rotate: ROTATIONS[index % ROTATIONS.length] }] }}>
            <WobblyCard shadowSize={5}>
              <View style={styles.storeImageWrap}>
                <SanityImage url={item.image?.asset?.url} style={styles.storeImage as any} />
              </View>
              <View style={styles.storeBody}>
                <View style={styles.storeHeaderRow}>
                  <View style={styles.storeTitleCol}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    {item.cuisine && <Text style={styles.storeCuisine}>{item.cuisine}</Text>}
                  </View>
                  {item.stallNumber && (
                    <StickyBadge label={`Stall ${item.stallNumber}`} bg={colors.postit} rotate="2deg" />
                  )}
                </View>
                {item.description && (
                  <Text style={styles.storeDesc} numberOfLines={2}>{item.description}</Text>
                )}
                <Text style={styles.storeCta}>view menu →</Text>
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
  header: { marginBottom: 4 },
  headerImageWrap: { width: "100%", height: 160, borderRadius: 16, borderWidth: 2.5, borderColor: colors.pencil, overflow: "hidden", marginBottom: 12 },
  headerImage: { width: "100%", height: "100%", borderRadius: 13 },
  headerTitle: { fontFamily: "Kalam_700Bold", fontSize: 24, color: colors.pencil },
  headerLocation: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88", marginTop: 4 },
  dashedLine: { borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "33", marginVertical: 10 },
  storeImageWrap: { width: "100%", height: 150, overflow: "hidden", borderTopLeftRadius: 30, borderTopRightRadius: 10 },
  storeImage: { width: "100%", height: 150, borderTopLeftRadius: 30, borderTopRightRadius: 10 },
  storeBody: { padding: 14 },
  storeHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  storeTitleCol: { flex: 1 },
  storeName: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  storeCuisine: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.pencil + "77", marginTop: 2 },
  storeDesc: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88", marginTop: 8, lineHeight: 20 },
  storeCta: { fontFamily: "Kalam_700Bold", fontSize: 14, color: colors.ink, marginTop: 8 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "66" },
});
