import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { syncOutbox } from "../../src/api/sync";
import { useSession } from "../../src/auth/session-context";
import { Button, Card, sharedStyles, StatusPill } from "../../src/components/ui";
import { allOperations, initialiseOfflineStore, queued } from "../../src/db/offline";
import { colors } from "../../src/theme";

type Operation = {
  id: string;
  operation: string;
  status: string;
  attempts: number;
  created_at: string;
};

export default function Sync() {
  const { session } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    initialiseOfflineStore();
    setOperations(allOperations());
  };

  useEffect(refresh, []);

  async function synchronize() {
    if (!session) return;
    setLoading(true);
    setMessage("");
    try {
      const deviceId =
        Application.getAndroidId() ??
        (await Application.getIosIdForVendorAsync()) ??
        "anagu-field-device";
      const results = await syncOutbox(deviceId, session.user.id, session.accessToken);
      const processed = results.filter((item) => item.ok).length;
      const accepted = results.filter((item) => item.accepted).length;
      setMessage(`${processed} processed; ${accepted} accepted into the registry.`);
      refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? `Synchronization paused: ${reason.message}`
          : "Synchronization paused."
      );
    } finally {
      setLoading(false);
    }
  }

  const queueCount = queued().length;
  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView contentContainerStyle={sharedStyles.page}>
        <View>
          <Text style={sharedStyles.eyebrow}>RESILIENT CONNECTIVITY</Text>
          <Text style={sharedStyles.title}>Synchronization centre</Text>
          <Text style={sharedStyles.body}>
            Retry safely without duplicating acknowledged field operations.
          </Text>
        </View>
        <View style={styles.status}>
          <Ionicons name="cloud-upload-outline" size={38} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>WAITING TO SYNC</Text>
            <Text style={styles.statusMetric}>{queueCount} records</Text>
          </View>
        </View>
        <Button
          label={loading ? "Synchronizing…" : "Synchronize now"}
          onPress={synchronize}
          loading={loading}
          disabled={!queueCount}
        />
        {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
        <Card>
          <Text style={sharedStyles.heading}>Operation history</Text>
          {operations.map((operation) => (
            <View style={styles.operation} key={operation.id}>
              <View style={styles.operationIcon}>
                <Ionicons
                  name={operation.status === "SYNCED" ? "checkmark-outline" : "time-outline"}
                  size={17}
                  color={colors.green700}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.operationTitle}>
                  {operation.operation.replaceAll("_", " ")}
                </Text>
                <Text style={sharedStyles.body}>
                  {new Date(operation.created_at).toLocaleString()} · {operation.attempts} retries
                </Text>
              </View>
              <StatusPill label={operation.status} success={operation.status === "SYNCED"} />
            </View>
          ))}
          {!operations.length && (
            <Text style={sharedStyles.body}>No offline operations recorded.</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 20,
    borderRadius: 17,
    backgroundColor: colors.green900
  },
  statusLabel: {
    color: "#b9d2c3",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1
  },
  statusMetric: {
    marginTop: 4,
    color: colors.white,
    fontFamily: "serif",
    fontSize: 26
  },
  operation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  operationIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.green100
  },
  operationTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  }
});
