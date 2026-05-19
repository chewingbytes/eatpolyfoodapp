/**
 * HandButton — hand-drawn oval button with hard shadow.
 * Presses flat on active (shadow disappears, translates).
 */
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { colors, wobbly } from "../../lib/theme";

interface HandButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
  fullWidth?: boolean;
}

const VARIANTS = {
  primary: { bg: colors.white, text: colors.pencil },
  secondary: { bg: colors.muted, text: colors.pencil },
  danger: { bg: colors.accent, text: colors.white },
};

export function HandButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  style,
  fullWidth = false,
}: HandButtonProps) {
  const translateAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const v = VARIANTS[variant];

  const radius = {
    borderTopLeftRadius: wobbly.topLeft,
    borderTopRightRadius: wobbly.topRight,
    borderBottomRightRadius: wobbly.bottomRight,
    borderBottomLeftRadius: wobbly.bottomLeft,
  };

  function handlePressIn() {
    Animated.parallel([
      Animated.timing(translateAnim, { toValue: { x: 4, y: 4 }, duration: 80, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }

  function handlePressOut() {
    Animated.parallel([
      Animated.timing(translateAnim, { toValue: { x: 0, y: 0 }, duration: 80, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <View style={[styles.wrapper, fullWidth && styles.fullWidth, { opacity: disabled ? 0.5 : 1 }]}>
        {/* Shadow */}
        <Animated.View style={[styles.shadow, radius, { opacity: shadowAnim }]} />
        {/* Button */}
        <Animated.View
          style={[
            styles.button,
            radius,
            { backgroundColor: v.bg, transform: translateAnim.getTranslateTransform() },
            style,
          ]}
        >
          <Text style={[styles.label, { color: v.text }]}>{label}</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginBottom: 4,
    marginRight: 4,
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  shadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: colors.pencil,
  },
  button: {
    borderWidth: 2.5,
    borderColor: colors.pencil,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 18,
    letterSpacing: 0.3,
  },
});
