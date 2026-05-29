import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { HandButton } from "../../components/ui/HandButton";
import { WobblyInput } from "../../components/ui/WobblyInput";
import { WobblyCard } from "../../components/ui/WobblyCard";
import { colors } from "../../lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Oops!", "Please enter your email and password ✏️");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header doodle area */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/newlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome back! 👋</Text>
          <Text style={styles.subtitle}>Sign in to track your orders</Text>
          {/* Dashed divider */}
          <View style={styles.dashedLine} />
        </View>

        <WobblyCard style={styles.cardContent} decoration="tape">
          <WobblyInput
            label="Email ✉️"
            placeholder="student@poly.edu.sg"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <WobblyInput
            label="Password 🔑"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <HandButton
            label={loading ? "Signing in..." : "Sign In →"}
            onPress={handleLogin}
            disabled={loading}
            fullWidth
            variant="primary"
          />
        </WobblyCard>

        {/* Guest option */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.guestBtn}
        >
          <Text style={styles.guestText}>browse as guest (no order tracking)</Text>
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>new here? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>create an account →</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Decorative scribble */}
        <Text style={styles.scribble}>~ pre-order canteen food at your poly ~</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { width: 100, height: 100, marginBottom: 16, transform: [{ rotate: "-2deg" }] },
  title: { fontFamily: "Kalam_700Bold", fontSize: 32, color: colors.pencil, textAlign: "center" },
  subtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 17, color: colors.pencil + "88", marginTop: 6 },
  dashedLine: { marginTop: 20, width: "70%", borderBottomWidth: 2, borderBottomColor: colors.pencil, borderStyle: "dashed" },
  cardContent: { padding: 20, marginBottom: 8 },
  guestBtn: { alignSelf: "center", marginTop: 20, padding: 8 },
  guestText: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "66", textDecorationLine: "underline" },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  signupText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil },
  signupLink: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.ink },
  scribble: { fontFamily: "PatrickHand_400Regular", fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 36 },
});
