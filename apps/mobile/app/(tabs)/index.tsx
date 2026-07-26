import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../../src/api/client";
import { useSession } from "../../src/auth/session-context";
import { Button, Card, sharedStyles, StatusPill } from "../../src/components/ui";
import { initialiseOfflineStore, queued } from "../../src/db/offline";
import { colors } from "../../src/theme";

type Application = { id: string; status: string; parcel: { parcelCode: string } };

export default function Overview() {
  const { session, signOut } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    initialiseOfflineStore();
    setQueueCount(queued().length);
    if (session) {
      await apiRequest<Application[]>("/applications", {}, session.accessToken)
        .then(setApplications)
        .catch(() => undefined);
    }
  };

  useEffect(() => {
    refresh();
  }, [session]);

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView
        contentContainerStyle={sharedStyles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={sharedStyles.between}>
          <View>
            <Text style={sharedStyles.eyebrow}>FIELD OVERVIEW</Text>
            <Text style={sharedStyles.title}>Hello, {session?.user.fullName.split(" ")[0]}.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {session?.user.fullName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>OFFLINE OUTBOX</Text>
            <Text style={styles.heroMetric}>{queueCount} queued</Text>
            <Text style={styles.heroCopy}>
              Records remain encrypted locally until acknowledged.
            </Text>
          </View>
          <Ionicons name="cloud-offline-outline" size={42} color={colors.gold} />
        </View>
        <View style={styles.metrics}>
          <Card>
            <Text style={sharedStyles.label}>APPLICATIONS</Text>
            <Text style={styles.metric}>{applications.length}</Text>
          </Card>
          <Card>
            <Text style={sharedStyles.label}>IN REVIEW</Text>
            <Text style={styles.metric}>
              {
                applications.filter(
                  (item) => !["MINTED", "REJECTED", "CANCELLED"].includes(item.status)
                ).length
              }
            </Text>
          </Card>
        </View>
        <Card>
          <View style={sharedStyles.between}>
            <Text style={sharedStyles.heading}>Recent claims</Text>
            <StatusPill label="Live" success />
          </View>
          {applications.slice(0, 4).map((application) => (
            <View style={styles.application} key={application.id}>
              <View style={styles.applicationIcon}>
                <Ionicons name="map-outline" size={18} color={colors.green700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.applicationTitle}>{application.parcel.parcelCode}</Text>
                <Text style={sharedStyles.body}>Registration workflow</Text>
              </View>
              <StatusPill label={application.status} success={application.status === "MINTED"} />
            </View>
          ))}
          {!applications.length && (
            <Text style={sharedStyles.body}>
              No online applications yet. Capture a parcel or create a claim.
            </Text>
          )}
          <Button label="Capture new field record" onPress={() => router.push("/(tabs)/capture")} />
        </Card>
        <Button
          label="Sign out"
          secondary
          onPress={async () => {
            await signOut();
            router.replace("/login");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.gold
  },
  avatarText: { color: colors.green950, fontWeight: "900" },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 20,
    borderRadius: 17,
    backgroundColor: colors.green900
  },
  heroLabel: {
    color: "#b9d2c3",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  heroMetric: {
    marginTop: 5,
    color: colors.white,
    fontFamily: "serif",
    fontSize: 28
  },
  heroCopy: { marginTop: 4, color: "#b9d2c3", fontSize: 12 },
  metrics: { flexDirection: "row", gap: 12 },
  metric: { color: colors.ink, fontFamily: "serif", fontSize: 30 },
  application: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  applicationIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.green100
  },
  applicationTitle: { color: colors.ink, fontWeight: "800" }
});
