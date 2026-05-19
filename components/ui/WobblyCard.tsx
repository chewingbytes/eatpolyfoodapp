/**
 * WobblyCard — hand-drawn card with hard offset shadow.
 * The shadow is a dark sibling View offset 4px down-right behind the card.
 */
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, wobblyLg } from "../../lib/theme";

type Decoration = "tape" | "tack" | "none";

interface WobblyCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadowColor?: string;
  bg?: string;
  decoration?: Decoration;
  shadowSize?: number;
}

export function WobblyCard({
  children,
  style,
  shadowColor = colors.pencil,
  bg = colors.white,
  decoration = "none",
  shadowSize = 4,
}: WobblyCardProps) {
  const radius = {
    borderTopLeftRadius: wobblyLg.topLeft,
    borderTopRightRadius: wobblyLg.topRight,
    borderBottomRightRadius: wobblyLg.bottomRight,
    borderBottomLeftRadius: wobblyLg.bottomLeft,
  };

  return (
    <View style={[styles.wrapper, { marginBottom: shadowSize, marginRight: shadowSize }]}>
      {/* Hard shadow layer */}
      <View
        style={[
          styles.shadow,
          radius,
          {
            backgroundColor: shadowColor,
            top: shadowSize,
            left: shadowSize,
          },
        ]}
      />
      {/* Card */}
      <View
        style={[
          styles.card,
          radius,
          { backgroundColor: bg },
          style,
        ]}
      >
        {decoration === "tape" && (
          <View style={styles.tape} />
        )}
        {decoration === "tack" && (
          <View style={styles.tack} />
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    borderWidth: 2.5,
    borderColor: colors.pencil,
    overflow: "hidden",
  },
  tape: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    width: 60,
    height: 16,
    backgroundColor: "rgba(200,200,200,0.55)",
    borderRadius: 2,
    transform: [{ rotate: "-1deg" }],
    zIndex: 10,
  },
  tack: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.pencil,
    zIndex: 10,
  },
});
