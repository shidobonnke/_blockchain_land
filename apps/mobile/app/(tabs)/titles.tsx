import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../../src/api/client";
import { useSession } from "../../src/auth/session-context";
import { Card, sharedStyles, StatusPill } from "../../src/components/ui";
import { colors } from "../../src/theme";

type Parcel = {
  id: string;
  parcelCode: string;
  address: string;
  state: string;
  lga: string;
  status: string;
  geometryHash?: string;
};

export default function Titles() {
  const { session } = useSession();
  const [titles, setTitles] = useState<Parcel[]>([]);

  useEffect(() => {
    if (!session) return;
    apiRequest<Parcel[]>("/parcels", {}, session.accessToken)
      .then((items) =>
        setTitles(items.filter((item) => ["ACTIVE", "TRANSFERRED"].includes(item.status)))
      )
      .catch(() => setTitles([]));
  }, [session]);

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView contentContainerStyle={sharedStyles.page}>
        <View>
          <Text style={sharedStyles.eyebrow}>DIGITAL TITLE VAULT</Text>
          <Text style={sharedStyles.title}>Verified ownership</Text>
          <Text style={sharedStyles.body}>
            Active titles are bound to a cadastral fingerprint and blockchain event.
          </Text>
        </View>
        {titles.map((title) => (
          <View style={styles.titleCard} key={title.id}>
            <View style={styles.titleTop}>
              <View style={styles.crest}>
                <Text style={styles.crestText}>NG</Text>
              </View>
              <StatusPill label={title.status} success />
            </View>
            <Text style={styles.documentLabel}>CERTIFICATE OF DIGITAL TITLE</Text>
            <Text style={styles.parcelCode}>{title.parcelCode}</Text>
            <Text style={styles.location}>
              {title.address} · {title.lga}, {title.state}
            </Text>
            <View style={styles.divider} />
            <View style={sharedStyles.between}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hashLabel}>GEOMETRY FINGERPRINT</Text>
                <Text style={styles.hash}>{title.geometryHash?.slice(0, 28) ?? "Pending"}…</Text>
              </View>
              <View style={styles.qr}>
                <Ionicons name="qr-code-outline" size={36} color={colors.green900} />
              </View>
            </View>
          </View>
        ))}
        {!titles.length && (
          <Card>
            <Ionicons name="shield-checkmark-outline" size={38} color={colors.green600} />
            <Text style={sharedStyles.heading}>No issued title yet</Text>
            <Text style={sharedStyles.body}>
              An approved application appears here after the registry contract mints its restricted
              title token.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleCard: {
    padding: 21,
    borderWidth: 1,
    borderColor: "#cbb477",
    borderRadius: 17,
    backgroundColor: "#fffaf0"
  },
  titleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  crest: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.gold
  },
  crestText: { color: colors.green950, fontWeight: "900" },
  documentLabel: {
    marginTop: 22,
    color: colors.green600,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  parcelCode: {
    marginTop: 5,
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 29
  },
  location: { marginTop: 5, color: colors.muted, fontSize: 13 },
  divider: { height: 1, marginVertical: 18, backgroundColor: "#dfd1ad" },
  hashLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1
  },
  hash: { marginTop: 5, color: colors.ink, fontFamily: "monospace", fontSize: 11 },
  qr: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  }
});
