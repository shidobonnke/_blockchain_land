import { Stack } from "expo-router";
import { SessionProvider } from "../src/auth/session-context";
import { colors } from "../src/theme";

export default function Layout() {
  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.green900 },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.paper }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
