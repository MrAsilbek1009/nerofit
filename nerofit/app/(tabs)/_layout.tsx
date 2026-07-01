import { Tabs } from "expo-router";
import { Dumbbell, Home, MessageCircle, User, Utensils } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useReminderSync } from "@/features/notifications/useReminderSync";
import { colors, fonts } from "@/theme";

export default function TabsLayout() {
  const { t } = useTranslation();
  // Keep local reminders' dynamic copy (streak count) fresh on foreground.
  useReminderSync();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textLo,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.label,
          fontSize: 10,
          letterSpacing: 0.6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      {/* 🔴 WORKOUT HIDDEN (gym-first pivot) — see WORKOUT_DEFERRED.md.
          Nerofit is gym-first now; the workout track RETURNS later.
          Restore: remove `href: null` below + re-add <ProgramsSection/> in index.tsx. */}
      <Tabs.Screen
        name="workouts"
        options={{
          href: null,
          title: t("tabs.workouts"),
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t("tabs.nutrition"),
          tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t("tabs.coach"),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
