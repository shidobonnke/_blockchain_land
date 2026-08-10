import * as Location from "expo-location";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Card, Field, sharedStyles } from "../../src/components/ui";
import { enqueue, initialiseOfflineStore } from "../../src/db/offline";
import { colors } from "../../src/theme";

export default function Capture() {
  const [parcelCode, setParcelCode] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [tenureType, setTenureType] = useState<"STATUTORY" | "CUSTOMARY">("CUSTOMARY");
  const [claim, setClaim] = useState("");
  const [points, setPoints] = useState<[number, number][]>([]);
  const [status, setStatus] = useState("Boundary capture has not started.");
  const [capturing, setCapturing] = useState(false);

  async function capturePoint() {
    setCapturing(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setStatus("Location permission is required for parcel capture.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const point: [number, number] = [location.coords.longitude, location.coords.latitude];
      setPoints((current) => [...current, point]);
      setStatus(
        `Point ${points.length + 1} captured at ±${Math.round(
          location.coords.accuracy ?? 0
        )} m accuracy.`
      );
    } catch {
      setStatus("Unable to acquire a reliable coordinate. Please try again.");
    } finally {
      setCapturing(false);
    }
  }

  function removeLastPoint() {
    setPoints((current) => current.slice(0, -1));
    setStatus("Last boundary point removed.");
  }

  function save() {
    if (
      !parcelCode.trim() ||
      !state.trim() ||
      !lga.trim() ||
      !address.trim() ||
      claim.trim().length < 10
    ) {
      setStatus("Parcel code, state, LGA, address and claim description are required.");
      return;
    }
    if (points.length < 3) {
      setStatus("Capture at least three distinct boundary points.");
      return;
    }
    initialiseOfflineStore();
    enqueue("CREATE_FIELD_APPLICATION", {
      parcelCode,
      state,
      lga,
      address,
      tenureType,
      claimDescription: claim,
      geometry: {
        type: "Polygon",
        coordinates: [[...points, points[0]]]
      },
      capturedAt: new Date().toISOString()
    });
    setParcelCode("");
    setAddress("");
    setState("");
    setLga("");
    setClaim("");
    setPoints([]);
    setStatus("Record encrypted locally and added to the synchronization outbox.");
  }

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView contentContainerStyle={sharedStyles.page}>
        <View>
          <Text style={sharedStyles.eyebrow}>OFFLINE FIELD CAPTURE</Text>
          <Text style={sharedStyles.title}>Map the physical claim.</Text>
          <Text style={sharedStyles.body}>
            Walk the parcel boundary and capture vertices in sequence.
          </Text>
        </View>
        <Card>
          <Text style={sharedStyles.heading}>Claim details</Text>
          <Field
            label="Parcel reference"
            value={parcelCode}
            onChangeText={setParcelCode}
            placeholder="AN-LA-001"
            autoCapitalize="characters"
          />
          <Field label="State" value={state} onChangeText={setState} placeholder="Enugu" />
          <Field
            label="Local government area"
            value={lga}
            onChangeText={setLga}
            placeholder="Nsukka"
          />
          <Field
            label="Location or address"
            value={address}
            onChangeText={setAddress}
            placeholder="Village, ward, LGA and state"
          />
          <Text style={sharedStyles.body}>Tenure type</Text>
          <View style={styles.tenureRow}>
            {(["CUSTOMARY", "STATUTORY"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.tenureOption, tenureType === value && styles.tenureSelected]}
                onPress={() => setTenureType(value)}
              >
                <Text style={styles.checkText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field
            label="Basis of ownership"
            value={claim}
            onChangeText={setClaim}
            placeholder="Purchase, inheritance, occupancy and witnesses"
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </Card>
        <Card>
          <View style={sharedStyles.between}>
            <Text style={sharedStyles.heading}>GPS boundary</Text>
            <View style={styles.counter}>
              <Text style={styles.counterText}>{points.length} points</Text>
            </View>
          </View>
          <View style={styles.map}>
            <Text style={styles.mapText}>
              {points.length
                ? points
                    .map(
                      ([longitude, latitude], index) =>
                        `${index + 1}. ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    )
                    .join("\n")
                : "Captured coordinates will appear here."}
            </Text>
          </View>
          <Button
            label={capturing ? "Acquiring coordinate…" : "Capture boundary point"}
            onPress={capturePoint}
            loading={capturing}
          />
          <Button
            label="Remove last point"
            onPress={removeLastPoint}
            secondary
            disabled={!points.length}
          />
          <Text style={sharedStyles.body}>{status}</Text>
        </Card>
        <Card>
          <Text style={sharedStyles.heading}>Evidence checklist</Text>
          {[
            "Applicant identity available",
            "Survey plan photographed",
            "Customary witnesses recorded",
            "Boundary reviewed with claimant"
          ].map((item, index) => (
            <TouchableOpacity style={styles.check} key={item}>
              <View style={styles.checkNumber}>
                <Text style={styles.checkNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.checkText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </Card>
        <Button label="Save securely offline" onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tenureRow: { flexDirection: "row", gap: 8 },
  tenureOption: { padding: 10, borderRadius: 8, backgroundColor: colors.green100 },
  tenureSelected: { borderWidth: 2, borderColor: colors.green700 },
  textarea: { minHeight: 100, paddingTop: 13, textAlignVertical: "top" },
  counter: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: colors.green100
  },
  counterText: { color: colors.green700, fontSize: 10, fontWeight: "900" },
  map: {
    minHeight: 150,
    padding: 14,
    borderRadius: 11,
    backgroundColor: "#e8eadf"
  },
  mapText: { color: colors.green900, fontFamily: "monospace", fontSize: 12, lineHeight: 20 },
  check: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 8 },
  checkNumber: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.green100
  },
  checkNumberText: { color: colors.green700, fontWeight: "900" },
  checkText: { flex: 1, color: colors.ink, fontSize: 14 }
});
