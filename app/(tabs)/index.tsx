import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { sanityFetch } from "../../lib/sanity";
import { ALL_FOOD_PRODUCTS_QUERY, type FoodProductBrowse } from "../../lib/groq";
import { SanityImage } from "../../components/SanityImage";
import { LoadingView } from "../../components/LoadingView";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { colors } from "../../lib/theme";
import { useCartStore } from "../../store/cart";

const CATEGORIES = [
  { key: "all",      label: "🍽️ All"      },
  { key: "main",     label: "🍛 Mains"    },
  { key: "side",     label: "🥗 Sides"    },
  { key: "beverage", label: "🧋 Drinks"   },
  { key: "dessert",  label: "🍨 Desserts" },
  { key: "snack",    label: "🍟 Snacks"   },
];

export default function MenuScreen() {
  const [products, setProducts] = useState<FoodProductBrowse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  async function fetchData() {
    try {
      const data = await sanityFetch<FoodProductBrowse[]>(ALL_FOOD_PRODUCTS_QUERY);
      setProducts(data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() =>
    activeCategory === "all" ? products : products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  );

  if (loading) return <LoadingView />;

  function handleAddToCart(product: FoodProductBrowse) {
    const cartStoreId = cartItems[0]?.storeId;
    if (cartStoreId && cartStoreId !== product.store?._id) {
      Alert.alert(
        "Different store",
        "Your cart has items from another store. Clear it and add this item?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear & Add",
            style: "destructive",
            onPress: () => addItem({
              id: product._id,
              name: product.name,
              priceInCents: Math.round(product.price * 100),
              qty: 1,
              storeId: product.store?._id ?? "",
              storeName: product.store?.name ?? "",
            }),
          },
        ]
      );
      return;
    }
    addItem({
      id: product._id,
      name: product.name,
      priceInCents: Math.round(product.price * 100),
      qty: 1,
      storeId: product.store?._id ?? "",
      storeName: product.store?.name ?? "",
    });
  }

  return (
    <View style={styles.container}>
      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.chip, activeCategory === cat.key && styles.chipActive]}
            onPress={() => setActiveCategory(cat.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, activeCategory === cat.key && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
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
            <Text style={styles.emptyText}>nothing here yet 🍽️</Text>
          </WobblyCard>
        }
        renderItem={({ item, index }) => {
          const rotate = ["-0.5deg", "0.5deg", "-1deg", "1deg", "0deg"][index % 5];
          const inCart = cartItems.find((c) => c.id === item._id);
          return (
            <WobblyCard style={StyleSheet.flatten([styles.card, { transform: [{ rotate }] }])} decoration="tack">
              <View style={styles.cardInner}>
                {item.image?.asset?.url ? (
                  <SanityImage
                    url={item.image.asset.url}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.tagRow}>
                    {item.isHalal && <Text style={styles.tag}>☪️ Halal</Text>}
                    {item.isVegetarian && <Text style={styles.tag}>🥗 Veg</Text>}
                    {item.spicyLevel && item.spicyLevel > 0
                      ? <Text style={styles.tag}>{"🌶️".repeat(Math.min(item.spicyLevel, 3))}</Text>
                      : null}
                  </View>
                  {item.store?.name ? (
                    <Text style={styles.storeName}>🏪 {item.store.name}</Text>
                  ) : null}
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                    <HandButton
                      label={inCart ? `in cart (${inCart.qty})` : "+ add"}
                      variant={inCart ? "secondary" : "primary"}
                      onPress={() => handleAddToCart(item)}
                    />
                  </View>
                </View>
              </View>
            </WobblyCard>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.pencil + "44",
    backgroundColor: colors.paper,
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
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    padding: 12,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 28 },
  info: { flex: 1, gap: 3 },
  name: {
    fontFamily: "Kalam_700Bold",
    fontSize: 16,
    color: colors.pencil,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.pencil + "88",
  },
  storeName: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.ink,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  price: {
    fontFamily: "Kalam_700Bold",
    fontSize: 18,
    color: colors.accent,
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 16,
    color: colors.pencil + "88",
  },
});
