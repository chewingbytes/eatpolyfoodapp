/**
 * Vendor Add-on Groups Screen
 *
 * Shows all add-on groups for the vendor's store.
 * Vendors can toggle entire groups on/off with one tap,
 * and expand each group to toggle individual options.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/auth";
import { useVendorStore } from "../../store/vendor";
import { vendorPatch } from "../../lib/sanity";
import { WobblyCard } from "../../components/ui/WobblyCard";
import type { VendorAddOnGroup } from "../../lib/groq";
import { colors } from "../../lib/theme";

export default function VendorAddOnsScreen() {
  const { session } = useAuthStore();
  const { addOnGroups, toggleAddOnGroupActive, setAddOnGroups } = useVendorStore();
  const [toggling, setToggling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleToggleGroup(group: VendorAddOnGroup) {
    if (!session?.access_token || toggling) return;
    setToggling(group._id);
    toggleAddOnGroupActive(group._id); // Optimistic
    try {
      await vendorPatch(session.access_token, group._id, {
        set: { isActive: !group.isActive },
      });
    } catch (e) {
      toggleAddOnGroupActive(group._id); // Revert
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[toggleGroup error]", msg);
      Alert.alert("Error", msg);
    } finally {
      setToggling(null);
    }
  }

  async function handleToggleOption(group: VendorAddOnGroup, optKey: string, current: boolean) {
    if (!session?.access_token || toggling) return;
    setToggling(`${group._id}-${optKey}`);
    // Optimistic update
    setAddOnGroups(
      addOnGroups.map((g) =>
        g._id === group._id
          ? {
              ...g,
              options: g.options.map((o) =>
                o._key === optKey ? { ...o, isAvailable: !current } : o
              ),
            }
          : g
      )
    );
    try {
      await vendorPatch(session.access_token, group._id, {
        set: { [`options[_key == "${optKey}"].isAvailable`]: !current },
      });
    } catch (e) {
      // Revert
      setAddOnGroups(
        addOnGroups.map((g) =>
          g._id === group._id
            ? {
                ...g,
                options: g.options.map((o) =>
                  o._key === optKey ? { ...o, isAvailable: current } : o
                ),
              }
            : g
        )
      );
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[toggleOption error]", msg);
      Alert.alert("Error", msg);
    } finally {
      setToggling(null);
    }
  }

  function renderGroup({ item: group }: { item: VendorAddOnGroup }) {
    const isExpanded = expanded === group._id;
    const activeOptions = group.options.filter((o) => o.isAvailable !== false).length;

    return (
      <WobblyCard style={[styles.groupCard, !group.isActive && styles.groupCardOff]}>
        {/* Group header */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => setExpanded(isExpanded ? null : group._id)}
          activeOpacity={0.8}
        >
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, !group.isActive && styles.dimText]} numberOfLines={2}>
              {group.name}
            </Text>
            <Text style={styles.groupMeta}>
              {group.selectionType === "single" ? "single choice" : "multiple choice"}
              {group.isRequired ? " · required" : " · optional"}
              {" · "}{activeOptions}/{group.options.length} options active
            </Text>
          </View>
          <View style={styles.groupRight}>
            {toggling === group._id ? (
              <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
            ) : (
              <Switch
                value={group.isActive}
                onValueChange={() => handleToggleGroup(group)}
                disabled={!!toggling}
                trackColor={{ false: colors.muted, true: "#86efac" }}
                thumbColor={group.isActive ? "#16a34a" : colors.pencil + "55"}
                ios_backgroundColor={colors.muted}
              />
            )}
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={colors.pencil + "66"}
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>

        {/* Options list (expanded) */}
        {isExpanded && (
          <View style={styles.optionsList}>
            <View style={styles.divider} />
            {group.options.map((opt) => {
              const optActive = opt.isAvailable !== false;
              const toggleId = `${group._id}-${opt._key}`;
              return (
                <View key={opt._key} style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, !optActive && styles.dimText]}>
                      {opt.name}
                    </Text>
                    <Text style={styles.optionPrice}>
                      {opt.priceInCents === 0 ? "free" : `+$${(opt.priceInCents / 100).toFixed(2)}`}
                    </Text>
                  </View>
                  {toggling === toggleId ? (
                    <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
                  ) : (
                    <Switch
                      value={optActive}
                      onValueChange={() => handleToggleOption(group, opt._key, optActive)}
                      disabled={!!toggling}
                      trackColor={{ false: colors.muted, true: "#86efac" }}
                      thumbColor={optActive ? "#16a34a" : colors.pencil + "55"}
                      ios_backgroundColor={colors.muted}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </WobblyCard>
    );
  }

  return (
    <FlatList
      data={addOnGroups}
      keyExtractor={(g) => g._id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={renderGroup}
      ListHeaderComponent={
        <Text style={styles.headerHint}>
          Tap a group to expand its options.{"\n"}Toggle the switch to show or hide it.
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>➕</Text>
          <Text style={styles.emptyText}>
            No add-on groups yet.{"\n"}Create them in the Sanity dashboard.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 48, gap: 10 },

  headerHint: {
    fontFamily: "PatrickHand_400Regular", fontSize: 16,
    color: colors.pencil + "88", lineHeight: 24, marginBottom: 8,
  },

  groupCard: { padding: 16 },
  groupCardOff: { opacity: 0.65 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupInfo: { flex: 1, gap: 4 },
  groupName: { fontFamily: "Kalam_700Bold", fontSize: 20, color: colors.pencil },
  groupMeta: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  groupRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  chevron: { marginLeft: 4 },
  dimText: { color: colors.pencil + "66" },

  divider: { height: 1.5, backgroundColor: colors.muted, marginVertical: 12 },

  optionsList: {},
  optionRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.muted,
    gap: 12,
  },
  optionInfo: { flex: 1, gap: 2 },
  optionName: { fontFamily: "PatrickHand_400Regular", fontSize: 17, color: colors.pencil },
  optionPrice: { fontFamily: "PatrickHand_400Regular", fontSize: 14, color: colors.pencil + "88" },
  spinner: { width: 52, height: 31, justifyContent: "center", alignItems: "center" },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontFamily: "PatrickHand_400Regular", fontSize: 18,
    color: colors.pencil + "88", textAlign: "center", lineHeight: 28,
  },
});
