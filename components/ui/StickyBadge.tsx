/**
 * StickyBadge — post-it style status badge with wobbly outline.
 */
import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../lib/theme";

interface StickyBadgeProps {
  label: string;
  color?: string;
  bg?: string;
  style?: ViewStyle;
  rotate?: string;
}

export function StickyBadge({
  label,
  color = colors.pencil,
  bg = colors.postit,
  style,
  rotate = "0deg",
}: StickyBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          transform: [{ rotate }],
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 2,
    borderColor: colors.pencil,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
