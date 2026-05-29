import "../global.css";
import React, { useEffect } from "react";

const _consoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("forwardRef render functions accept exactly two parameters")) return;
  _consoleError(...args);
};

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts, Kalam_700Bold } from "@expo-google-fonts/kalam";
import { PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";
import { supabase } from "../lib/supabase";
import { sanityFetch } from "../lib/sanity";
import {
  registerForPushNotifications,
  storePushToken,
} from "../lib/notifications";
import { useAuthStore } from "../store/auth";
import { useVendorStore } from "../store/vendor";
import { hydrateCart } from "../store/cart";
import { VENDOR_STORE_QUERY, type VendorStore } from "../lib/groq";
import { colors } from "../lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const { setIsVendor, setStore, clearVendor } = useVendorStore();

  const [fontsLoaded] = useFonts({
    Kalam_700Bold,
    PatrickHand_400Regular,
  });

  useEffect(() => {
    // Hydrate persisted cart
    hydrateCart();

    // Bootstrap Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) clearVendor();
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Check vendor status whenever user changes
  useEffect(() => {
    if (!user?.id || !user?.email) {
      clearVendor();
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profile")
          .select("is_vendor")
          .eq("user_id", user.id)
          .single();

        console.log("[vendor check] data:", data, "error:", error, "user.id:", user.id);

        if (data?.is_vendor) {
          setIsVendor(true);
          // Pre-fetch their store so the vendor tab loads instantly
          const store = await sanityFetch<VendorStore>(VENDOR_STORE_QUERY, {
            email: user.email!,
          });
          if (store) setStore(store);
        } else {
          setIsVendor(false);
        }
      } catch {
        // Non-fatal — default to non-vendor
        setIsVendor(false);
      }
    })();
  }, [user?.id]);

  // Register push notifications when user logs in
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().then((token) => {
      if (token) storePushToken(user.id, token);
    });
  }, [user?.id]);

  // Handle notification taps
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Could navigate to orders screen here
      }
    );
    return () => sub.remove();
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
        <Stack.Screen
          name="polytechnics/[slug]"
          options={{
            headerShown: true,
            title: "Canteens",
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="canteens/[slug]"
          options={{
            headerShown: true,
            title: "Stores",
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="stores/[slug]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="products/[slug]"
          options={{
            headerShown: true,
            title: "Item",
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="checkout/index"
          options={{
            headerShown: true,
            title: "Checkout",
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="checkout/success"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="orders/[id]"
          options={{
            headerShown: true,
            title: "Order Details",
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil },
            headerTintColor: colors.pencil,
          }}
        />
        <Stack.Screen
          name="scan-store"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="vendor" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
