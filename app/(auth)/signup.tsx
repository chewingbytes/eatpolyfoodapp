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

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Oops!", "Please fill in all fields ✏️");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Oops!", "Password must be at least 6 characters 🔑");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      Alert.alert(
        "Check your email! 📬",
        "We sent you a confirmation link. Please verify your email before signing in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
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
        <View style={styles.header}>
          <Image
            source={require("../../assets/newlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>pre-order canteen food, skip the queue</Text>
          <View style={styles.dashedLine} />
        </View>

        <WobblyCard style={styles.cardContent} decoration="tack">
          <WobblyInput
            label="Your name 👤"
            placeholder="Ahmad Rashid"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
          <WobblyInput
            label="Email ✉️"
            placeholder="Your Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <WobblyInput
            label="Password 🔑"
            placeholder="min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <HandButton
            label={loading ? "Creating account..." : "Create Account →"}
            onPress={handleSignup}
            disabled={loading}
            fullWidth
            variant="secondary"
          />
        </WobblyCard>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>sign in →</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { width: 180, height: 120, marginBottom: 8 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontFamily: "Kalam_700Bold", fontSize: 32, color: colors.pencil, textAlign: "center" },
  subtitle: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", marginTop: 6 },
  dashedLine: { marginTop: 20, width: "70%", borderBottomWidth: 2, borderBottomColor: colors.pencil, borderStyle: "dashed" },
  cardContent: { padding: 20, marginBottom: 8 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  loginText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil },
  loginLink: { fontFamily: "Kalam_700Bold", fontSize: 16, color: colors.ink },
});
