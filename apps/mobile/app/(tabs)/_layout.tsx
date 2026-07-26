import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useSession } from "../../src/auth/session-context";
import { colors } from "../../src/theme";

export default function TabLayout() {
  const { session, ready } = useSession();
  if (ready && !session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.green900 },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.green700,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          minHeight: 64,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopColor: colors.line,
          backgroundColor: colors.card
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Claims",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="documents-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="titles"
        options={{
          title: "Titles",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
