import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { HandButton } from "../../components/ui/HandButton";
import { colors } from "../../lib/theme";

export default function CheckoutSuccessScreen() {
  const scale = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      Animated.spring(rotation, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-3deg"] });

  return (
    <View style={styles.container}>
      {/* Celebration emoji, animated in */}
      <Animated.View style={[styles.emojiWrap, { transform: [{ scale }] }]}>
        <Text style={styles.emoji}>🎉</Text>
      </Animated.View>

      <Animated.Text style={[styles.title, { transform: [{ rotate }] }]}>
        Order placed!
      </Animated.Text>
      <Text style={styles.subtitle}>
        Your payment was received.{"\n"}Food is being prepared — stand by! 🍜
      </Text>

      {/* Dashed divider */}
      <View style={styles.dashedLine} />

      {/* Notification info card */}
      <Animated.View style={{ transform: [{ scale }] }}>
        <WobblyCard style={styles.notifCard} bg={colors.postit} decoration="tack">
          <Text style={styles.notifTitle}>📲 we'll ping you!</Text>
          <Text style={styles.notifText}>
            You'll get a push notification when it's time to collect your order. Check the orders tab anytime for live status.
          </Text>
        </WobblyCard>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.btnWrap}>
        <HandButton
          label="Track My Orders →"
          onPress={() => router.push("/(tabs)/orders")}
          variant="primary"
          fullWidth
        />
        <View style={{ height: 12 }} />
        <HandButton
          label="Order More Food"
          onPress={() => router.replace("/(tabs)")}
          variant="secondary"
          fullWidth
        />
      </View>

      {/* Scribble footer */}
      <Text style={styles.footer}>✏️ ~ thanks for ordering! ~ ✏️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emojiWrap: { marginBottom: 8 },
  emoji: { fontSize: 80 },
  title: { fontFamily: "Kalam_700Bold", fontSize: 40, color: colors.pencil, textAlign: "center", marginBottom: 12 },
  subtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 18, color: colors.pencil + "99", textAlign: "center", lineHeight: 26 },
  dashedLine: { width: "70%", borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.pencil + "33", marginVertical: 24 },
  notifCard: { padding: 18, marginBottom: 28 },
  notifTitle: { fontFamily: "Kalam_700Bold", fontSize: 18, color: colors.pencil, marginBottom: 8 },
  notifText: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "99", lineHeight: 22 },
  btnWrap: { width: "100%" },
  footer: { fontFamily: "PatrickHand_400Regular", fontSize: 13, color: colors.muted, marginTop: 28 },
});
