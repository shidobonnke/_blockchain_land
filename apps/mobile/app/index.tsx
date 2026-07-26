import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../src/auth/session-context";
import { colors } from "../src/theme";

export default function Index() {
  const { session, ready } = useSession();
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.green900
        }}
      >
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }
  return <Redirect href={session ? "/(tabs)" : "/login"} />;
}
