import { useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../../src/api/client";
import { useSession } from "../../src/auth/session-context";
import { Card, sharedStyles, StatusPill } from "../../src/components/ui";
import { colors } from "../../src/theme";

type Application = {
  id: string;
  status: string;
  claimDescription: string;
  updatedAt: string;
  parcel: { parcelCode: string; status: string };
  applicant: { fullName: string };
};

const workflow = [
  "SUBMITTED",
  "SPATIAL_REVIEW",
  "COMMUNITY_REVIEW",
  "LEGAL_REVIEW",
  "REGISTRAR_REVIEW",
  "BLOCKCHAIN_PENDING",
  "MINTED"
];

export default function Applications() {
  const { session } = useSession();
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!session) return;
    setError("");
    await apiRequest<Application[]>("/applications", {}, session.accessToken)
      .then(setItems)
      .catch((reason) => setError(reason.message));
  }

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
        <View>
          <Text style={sharedStyles.eyebrow}>MY LAND CLAIMS</Text>
          <Text style={sharedStyles.title}>Application tracking</Text>
          <Text style={sharedStyles.body}>
            Pull down to retrieve the latest institutional decisions.
          </Text>
        </View>
        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
        {items.map((item) => {
          const current = workflow.indexOf(item.status);
          return (
            <Card key={item.id}>
              <View style={sharedStyles.between}>
                <View>
                  <Text style={sharedStyles.label}>PARCEL</Text>
                  <Text style={sharedStyles.heading}>{item.parcel.parcelCode}</Text>
                </View>
                <StatusPill label={item.status} success={item.status === "MINTED"} />
              </View>
              <Text style={sharedStyles.body} numberOfLines={3}>
                {item.claimDescription}
              </Text>
              <View style={styles.progress}>
                {workflow.map((step, index) => (
                  <View
                    style={[styles.progressSegment, index <= current && styles.progressComplete]}
                    key={step}
                  />
                ))}
              </View>
              <Text style={sharedStyles.body}>
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </Card>
          );
        })}
        {!items.length && !error ? (
          <Card>
            <Text style={sharedStyles.heading}>No online applications</Text>
            <Text style={sharedStyles.body}>
              Offline field records appear online after they are synchronized and converted into
              registry applications.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: 4 },
  progressSegment: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    backgroundColor: colors.line
  },
  progressComplete: { backgroundColor: colors.green600 }
});
