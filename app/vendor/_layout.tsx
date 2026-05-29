import React from "react";
import { Stack } from "expo-router";
import { colors } from "../../lib/theme";

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { fontFamily: "Kalam_700Bold", color: colors.pencil, fontSize: 22 },
        headerTintColor: colors.pencil,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
        title: ""
      }}
    />
  );
}
