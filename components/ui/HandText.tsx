/**
 * HandText — typography with Kalam (headings) or PatrickHand (body).
 */
import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { colors } from "../../lib/theme";

interface HandTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "label";
  color?: string;
}

export function HandText({ variant = "body", color, style, children, ...props }: HandTextProps) {
  const variantStyle = styles[variant];
  return (
    <Text
      style={[variantStyle, color ? { color } : undefined, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: "Kalam_700Bold",
    fontSize: 36,
    color: colors.pencil,
    lineHeight: 44,
  },
  h2: {
    fontFamily: "Kalam_700Bold",
    fontSize: 26,
    color: colors.pencil,
    lineHeight: 34,
  },
  h3: {
    fontFamily: "Kalam_700Bold",
    fontSize: 20,
    color: colors.pencil,
    lineHeight: 28,
  },
  body: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 17,
    color: colors.pencil,
    lineHeight: 24,
  },
  caption: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 14,
    color: colors.pencil + "99",
    lineHeight: 20,
  },
  label: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 13,
    color: colors.pencil,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
