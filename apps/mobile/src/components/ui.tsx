import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from "react-native";
import { colors } from "../theme";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#8b948f" style={styles.input} {...props} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  secondary,
  disabled
}: {
  label: string;
  onPress(): void;
  loading?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        (disabled || loading) && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.green700 : colors.white} />
      ) : (
        <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function StatusPill({ label, success }: { label: string; success?: boolean }) {
  return (
    <View style={[styles.pill, success && styles.pillSuccess]}>
      <Text style={[styles.pillText, success && styles.pillSuccessText]}>{label}</Text>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { padding: 20, gap: 16, paddingBottom: 40 },
  eyebrow: {
    color: colors.green600,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.8
  },
  title: {
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 34,
    lineHeight: 39
  },
  heading: { color: colors.ink, fontFamily: "serif", fontSize: 23 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  error: {
    color: "#7b3028",
    borderColor: "#e7b8b1",
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    backgroundColor: "#fff0ed"
  },
  success: {
    color: "#145735",
    borderColor: "#acd6ba",
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    backgroundColor: "#eaf7ee"
  }
});

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    color: colors.ink,
    backgroundColor: colors.white
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.green700
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.green700,
    backgroundColor: "transparent"
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: "900" },
  secondaryText: { color: colors.green700 },
  card: {
    gap: 13,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.card
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "#f8e9c8"
  },
  pillSuccess: { backgroundColor: "#dcefe3" },
  pillText: {
    color: "#87520a",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  pillSuccessText: { color: "#17613c" }
});
