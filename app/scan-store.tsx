import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";

type VerifyResult = {
  status: "success" | "early" | "expired" | "error";
  order_id?: string;       // short_order_id on success
  collection_time?: string;
  message?: string;
};

const RESULT_CONFIG = {
  success: { bg: "#16a34a", emoji: "✅", title: "Verified!" },
  early:   { bg: "#ca8a04", emoji: "⏰", title: "You're Early!" },
  expired:    { bg: "#dc2626", emoji: "⌛", title: "Window Closed" },
  error:   { bg: "#6b7280", emoji: "🔍", title: "No Order Found" },
};

export default function ScanStoreScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const scanLock = useRef(false);

  const handleScan = useCallback(
    async ({ data }: { data: string }) => {
      if (scanLock.current || loading) return;
      scanLock.current = true;
      setScanning(false);
      setLoading(true);
      try {
        console.log("[scan] QR data scanned:", data);
        console.log("orderId:", orderId)
        const { data: rpcResult, error } = await supabase.rpc("verify_collection_v3", {
          target_store_id: data,
          target_order_id: orderId,
        });
        console.log("[scan] rpcResult:", JSON.stringify(rpcResult));
        console.log("[scan] error:", JSON.stringify(error));
        if (error) throw error;
        setResult(rpcResult as VerifyResult);
      } catch (err) {
        console.log("[scan] caught error:", JSON.stringify(err));
        setResult({ status: "error", message: "Could not verify order. Please try again." });
      } finally {
        setLoading(false);
        // Release lock after 5 s so a retry scan can't fire immediately
        setTimeout(() => { scanLock.current = false; }, 5000);
      }
    },
    [loading]
  );

  // Permission not determined yet
  if (!permission) {
    return <View style={styles.center} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={56} color={colors.pencil + "55"} />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permText}>
          Allow camera access to scan the store's QR code and verify your order.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnLabel}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkLabel}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Result screen
  if (result) {
    const cfg = RESULT_CONFIG[result.status];
    return (
      <View style={[styles.resultContainer, { backgroundColor: cfg.bg }]}>
        <Text style={styles.resultEmoji}>{cfg.emoji}</Text>
        <Text style={styles.resultTitle}>{cfg.title}</Text>

        {result.status === "success" && (
          <>
            <Text style={styles.resultOrderId}>{result.order_id}</Text>
            <Text style={styles.resultBody}>Show this screen to the vendor and collect your order!</Text>
          </>
        )}

        {result.status === "early" && result.collection_time && (
          <Text style={styles.resultBody}>
            Your slot is at{" "}
            {new Date(result.collection_time).toLocaleTimeString("en-SG", {
              timeZone: "Asia/Singapore",
              hour: "2-digit",
              minute: "2-digit",
            })}!
            {" "}{result.message}
          </Text>
        )}

        {result.status === "expired" && (
          <Text style={styles.resultBody}>
            {result.message}
          </Text>
        )}

        {result.status === "error" && (
          <Text style={styles.resultBody}>
            {result.message ?? "No active orders found for this stall."}
          </Text>
        )}

        <View style={styles.resultActions}>
          {result.status !== "success" && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { scanLock.current = false; setResult(null); setScanning(true); }}
            >
              <Text style={styles.retryLabel}>Try Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneLabel}>{result.status === "success" ? "Done ✓" : "Go Back"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera / scanner
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanning ? handleScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Verifying order…</Text>
          </View>
        ) : (
          <View style={styles.scanFrame}>
            <View style={styles.scanBox}>
              {/* Corner marks */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>Point at the store's QR code</Text>
          </View>
        )}
      </CameraView>

      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },

  // Scanner UI
  scanFrame: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  scanBox: { width: 230, height: 230 },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#fff", borderWidth: 4 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: {
    color: "#fff",
    fontFamily: "PatrickHand_400Regular",
    fontSize: 17,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  loadingOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", gap: 16 },
  loadingText: { color: "#fff", fontFamily: "PatrickHand_400Regular", fontSize: 18 },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Permission screen
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, padding: 32, gap: 12 },
  permTitle: { fontFamily: "Kalam_700Bold", fontSize: 22, color: colors.pencil, marginTop: 8 },
  permText: { fontFamily: "PatrickHand_400Regular", fontSize: 16, color: colors.pencil + "88", textAlign: "center" },
  permBtn: { backgroundColor: colors.ink, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 12, marginTop: 8 },
  permBtnLabel: { fontFamily: "Kalam_700Bold", fontSize: 16, color: "#fff" },
  backLink: { marginTop: 4 },
  backLinkLabel: { fontFamily: "PatrickHand_400Regular", fontSize: 15, color: colors.pencil + "77" },

  // Result screen
  resultContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, gap: 12 },
  resultEmoji: { fontSize: 80, marginBottom: 4 },
  resultTitle: { fontFamily: "Kalam_700Bold", fontSize: 34, color: "#fff" },
  resultOrderId: { fontFamily: "Kalam_700Bold", fontSize: 52, color: "#fff", letterSpacing: 2 },
  resultBody: { fontFamily: "PatrickHand_400Regular", fontSize: 19, color: "rgba(255,255,255,0.88)", textAlign: "center", lineHeight: 26 },
  resultActions: { flexDirection: "row", gap: 12, marginTop: 28 },
  retryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", alignItems: "center" },
  retryLabel: { fontFamily: "Kalam_700Bold", fontSize: 16, color: "#fff" },
  doneBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center" },
  doneLabel: { fontFamily: "Kalam_700Bold", fontSize: 16, color: "#fff" },
});
