import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { palette } = useTheme();
  const { session, ready } = useAuth();

  if (ready && !session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: "Write",
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: "My tags",
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
