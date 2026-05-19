import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { WobblyCard } from "./ui/WobblyCard";
import { HandButton } from "./ui/HandButton";
import { colors } from "../lib/theme";

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = "Something went wrong", onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😬</Text>
      <Text style={styles.title}>whoops!</Text>
      <WobblyCard style={styles.card}>
        <Text style={styles.message}>{message}</Text>
      </WobblyCard>
      {onRetry && (
        <View style={styles.btn}>
          <HandButton label="Try again →" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontFamily: "Kalam_700Bold", fontSize: 28, color: colors.accent, marginBottom: 16 },
  card: { padding: 16, marginBottom: 20 },
  message: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "99", textAlign: "center" },
  btn: {},
});
