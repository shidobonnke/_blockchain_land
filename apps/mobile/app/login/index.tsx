import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { apiRequest, Session } from "../../src/api/client";
import { useSession } from "../../src/auth/session-context";
import { Button, Card, Field, sharedStyles } from "../../src/components/ui";
import { colors } from "../../src/theme";

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const session = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await signIn(session);
      router.replace("/(tabs)");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <View style={styles.brand}>
          <Text style={styles.logo}>
            ANA<Text style={styles.gold}>GU</Text>
          </Text>
          <Text style={styles.brandCopy}>SECURE LAND ADMINISTRATION</Text>
        </View>
        <Card>
          <Text style={sharedStyles.heading}>Field access</Text>
          <Text style={sharedStyles.body}>
            Sign in to capture, synchronize and track land claims.
          </Text>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
          <Button
            label="Sign in securely"
            onPress={submit}
            loading={loading}
            disabled={!email || password.length < 8}
          />
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.green900 },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
    padding: 22
  },
  brand: { alignItems: "center" },
  logo: {
    color: colors.white,
    fontFamily: "serif",
    fontSize: 40,
    letterSpacing: 3
  },
  gold: { color: colors.gold },
  brandCopy: {
    marginTop: 6,
    color: "#b9d2c3",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5
  }
});
