/**
 * WobblyInput — text input with wobbly borders and hand-drawn feel.
 */
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Text,
} from "react-native";
import { colors, wobblyMd } from "../../lib/theme";

interface WobblyInputProps extends TextInputProps {
  label?: string;
}

export function WobblyInput({ label, style, ...props }: WobblyInputProps) {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const radius = {
    borderTopLeftRadius: wobblyMd.topLeft,
    borderTopRightRadius: wobblyMd.topRight,
    borderBottomRightRadius: wobblyMd.bottomRight,
    borderBottomLeftRadius: wobblyMd.bottomLeft,
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.pencil, colors.ink],
  });

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.border, radius, { borderColor }]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.pencil + "60"}
          onFocus={() =>
            Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start()
          }
          onBlur={() =>
            Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start()
          }
          {...props}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 15,
    color: colors.pencil,
    marginBottom: 6,
    marginLeft: 4,
  },
  border: {
    borderWidth: 2.5,
    borderColor: colors.pencil,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  input: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 17,
    color: colors.pencil,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
