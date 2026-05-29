import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, View, Text, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { useCartStore } from "../../store/cart";
import { useVendorStore } from "../../store/vendor";
import { colors } from "../../lib/theme";

function HeaderLogo() {
  return (
    <Image
      source={require("../../assets/newlogo.png")}
      style={{ width: 120, height: 36 }}
      resizeMode="contain"
    />
  );
}

function CartHeaderButton() {
  const totalQty = useCartStore((s) => s.totalQty());
  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/cart")}
      style={styles.cartBtn}
      activeOpacity={0.75}
    >
      <Ionicons name="cart-outline" size={26} color={colors.pencil} />
      {totalQty > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalQty}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const isVendor = useVendorStore((s) => s.isVendor);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.pencil + "55",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil, fontSize: 22 },
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        headerRight: () => <CartHeaderButton />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse Canteens",
          tabBarLabel: "Canteens",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null,
          title: "Your Cart 🛒",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders 📋",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
          ),
        }}
      />
      {/* Vendor-only "Manage" tab — hidden for regular users */}
      <Tabs.Screen
        name="vendor"
        options={{
          href: isVendor ? "/vendor" : null,
          title: "My Store",
          tabBarLabel: "My Store",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.paper,
    borderTopWidth: 2.5,
    borderTopColor: colors.pencil,
    paddingTop: 6,
    height: Platform.OS === "ios" ? 85 : 65,
    ...Platform.select({
      ios: {
        shadowColor: colors.pencil,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 0,
      },
    }),
  },
  tabLabel: {
    fontFamily: "PatrickHand_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  iconWrap: {
    position: "relative",
  },
  cartBtn: {
    position: "relative",
    marginRight: 16,
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.pencil,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: "Kalam_700Bold",
  },
});
