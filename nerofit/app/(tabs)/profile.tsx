import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ProgressLine,
  ProgressRing,
  SectionHeader,
  StatRow,
  VideoCard,
} from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { colors, space, typography } from "@/theme";

// Phase 1: this screen doubles as a primitives gallery — visual regression
// check for the design system. Replaced by the real Profile in Phase 6.
export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{
          padding: space[5],
          gap: space[5],
          paddingBottom: space[7],
        }}
      >
        <View style={{ gap: space[2] }}>
          <Text style={typography.labelCaps}>Design system</Text>
          <Text style={typography.h1}>Primitives</Text>
        </View>

        {/* Buttons */}
        <SectionHeader title="Buttons" />
        <View style={{ gap: space[3] }}>
          <Button label="Start workout" />
          <Button label="Log in" variant="secondary" />
          <Button label="Disabled" disabled />
          <Button label="Loading" loading />
        </View>

        {/* Chips */}
        <SectionHeader title="Chips" onSeeAll={() => undefined} />
        <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
          <Chip label="All type" selected />
          <Chip label="Strength" />
          <Chip label="Chest" />
          <Chip label="Arm" />
        </View>

        {/* Progress */}
        <SectionHeader title="Progress" />
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[5] }}>
            <ProgressRing progress={0.25} />
            <ProgressRing progress={0.6} />
            <ProgressRing progress={1} />
          </View>
          <View style={{ gap: space[3], marginTop: space[4] }}>
            <ProgressLine progress={0.45} />
            <ProgressLine progress={0.8} />
          </View>
        </Card>

        {/* Stats */}
        <SectionHeader title="Stats" />
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <StatRow value="160" suffix="mmHg" label="Blood pressure" />
            <StatRow value="80" suffix="bpm" label="Heart rate" />
          </View>
        </Card>

        {/* Avatar */}
        <SectionHeader title="Avatar" />
        <View style={{ flexDirection: "row", gap: space[3], alignItems: "center" }}>
          <Avatar name="Alex Carter" size={56} />
          <Avatar name="Alex Carter" size={40} />
          <Avatar name="A" size={32} />
        </View>

        {/* Video card */}
        <SectionHeader title="Video card" />
        <VideoCard
          title="Full Body Workout"
          subtitle="24 tasks · 4.9 ★"
        />

        {/* Dev sign-out — leaves in Phase 1 only */}
        <View style={{ marginTop: space[5] }}>
          <Button label="Sign out (dev)" variant="secondary" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
