/**
 * HeroCarousel — Peek-style postcard carousel for the home screen.
 *
 * Cards are ~82 % of screen width so the adjacent card always peeks through,
 * giving a clear affordance to swipe. Each card looks like a pinned postcard:
 * wobbly border, hard offset shadow, thumbtack, food image, dashed rule, text.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { SanityImage } from "../SanityImage";
import { colors } from "../../lib/theme";
import type { Promotion } from "../../lib/groq";

const { width: SCREEN_W } = Dimensions.get("window");

const CARD_W = Math.round(SCREEN_W * 0.82);
const IMG_H = 148;
const CARD_GAP = 14;
// Padding so the first and last card both appear centred
const SIDE_PAD = (SCREEN_W - CARD_W) / 2;

const ROTATIONS = ["-1.5deg", "1deg", "-2deg", "1.5deg", "0.5deg", "-0.8deg"] as const;

interface HeroCarouselProps {
  items: Promotion[];
  onPress?: (item: Promotion) => void;
}

export function HeroCarousel({ items, onPress }: HeroCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList<Promotion>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setActiveIdx(viewableItems[0].index);
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={items}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{
          // Shadow extends 5 px to the right of each card.
          // Shift content 3 px left so the visual card+shadow combo is centred.
          paddingLeft: SIDE_PAD - 3,
          paddingRight: SIDE_PAD + 8,
          gap: CARD_GAP,
          paddingBottom: 8,
          paddingTop: 4,
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item, index }) => {
          const rotate = ROTATIONS[index % ROTATIONS.length];
          const cardBg = item.bgColor ?? colors.postit;
          return (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => onPress?.(item)}
              style={[styles.cardWrap, { transform: [{ rotate }] }]}
            >
              {/* Hard offset shadow — sibling behind the card */}
              <View style={styles.shadow} />

              {/* Card */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {/* Thumbtack pin — centred over the image */}
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <View style={styles.tackContainer}>
                    <View style={styles.tack} />
                  </View>
                </View>

                {/* Food image */}
                {item.image?.asset?.url ? (
                  <SanityImage url={item.image.asset.url} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={styles.imagePlaceholderEmoji}>🍽️</Text>
                  </View>
                )}

                {/* Dashed ruler between image and text */}
                <View style={styles.dashedRule} />

                {/* Text content */}
                <View style={styles.textArea}>
                  {item.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge.toUpperCase()}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                  <Text style={styles.tapHint}>tap to explore →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Dash-bar pagination */}
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => flatRef.current?.scrollToIndex({ index: i, animated: true })}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <View style={[styles.dash, i === activeIdx && styles.dashActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },

  cardWrap: {
    width: CARD_W,
    marginBottom: 6,
    // No marginRight — it was causing snap to drift by 3 px per swipe.
    // paddingRight in contentContainerStyle gives the last card's shadow room.
  },

  // Hard offset shadow — solid rectangle behind, offset 5 px
  shadow: {
    position: "absolute",
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: colors.pencil,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 10,
  },

  card: {
    borderWidth: 2.5,
    borderColor: colors.pencil,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 10,
    overflow: "hidden",
  },

  // Tack overlay — placed above the image, horizontally centred
  tackContainer: {
    alignItems: "center",
    paddingTop: 10,
  },
  tack: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.pencil,
  },

  image: {
    width: "100%",
    height: IMG_H,
    // Inner top corner radii = card outer radii (28, 10) − borderWidth (2.5).
    // Ensures the image self-clips to the rounded corners on Android.
    borderTopLeftRadius: 25,
    borderTopRightRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 8,
  },
  imagePlaceholderEmoji: { fontSize: 52 },

  dashedRule: {
    marginHorizontal: 14,
    marginVertical: 0,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.pencil + "44",
  },

  textArea: {
    padding: 14,
    paddingTop: 10,
    gap: 3,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 3,
    marginBottom: 2,
  },
  badgeText: {
    fontFamily: "Kalam_700Bold",
    fontSize: 10,
    color: "#fff",
    letterSpacing: 0.8,
  },

  title: {
    fontFamily: "Kalam_700Bold",
    fontSize: 19,
    color: colors.pencil,
    lineHeight: 25,
  },
  subtitle: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil + "88",
  },
  tapHint: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    color: colors.ink,
    textAlign: "right",
    marginTop: 4,
  },

  // Dash-bar pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },
  dash: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.pencil + "28",
  },
  dashActive: {
    width: 32,
    backgroundColor: colors.accent,
  },

});
