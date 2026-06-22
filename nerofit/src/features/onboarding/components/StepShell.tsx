import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, ProgressLine } from "@/components/ui";
import { colors, space, typography } from "@/theme";

export type StepShellProps = {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onContinue?: () => void;
  children: React.ReactNode;
  /** When false the body is a fixed flex area (no page scroll) — e.g. for
   *  screens whose only scrollable parts are inner wheels. Defaults to true. */
  scrollable?: boolean;
};

export function StepShell({
  step, total, title, subtitle, ctaLabel, ctaDisabled, ctaLoading, onContinue, children,
  scrollable = true,
}: StepShellProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = step / total;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header — fixed at top */}
      <View style={{ paddingHorizontal: space[5], paddingTop: space[2], paddingBottom: space[3], gap: space[3] }}>
        <ProgressLine progress={progress} height={2} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" style={{ width: 28, height: 28, justifyContent: "center" }}>
            <ArrowLeft size={22} color={colors.textHi} />
          </Pressable>
          <Text style={typography.labelCaps}>{t("onboarding.stepOf", { step, total })}</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {scrollable ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[5], gap: space[5] }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: space[2] }}>
              <Text style={typography.h1}>{title}</Text>
              {subtitle ? <Text style={typography.bodyMuted}>{subtitle}</Text> : null}
            </View>
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: space[5], paddingBottom: space[5], gap: space[5] }}>
            <View style={{ gap: space[2] }}>
              <Text style={typography.h1}>{title}</Text>
              {subtitle ? <Text style={typography.bodyMuted}>{subtitle}</Text> : null}
            </View>
            {children}
          </View>
        )}
        {/* Footer — rises above the keyboard */}
        <View style={{ paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5] }}>
          <Button label={ctaLabel ?? t("onboarding.continue")} onPress={onContinue} disabled={ctaDisabled} loading={ctaLoading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
