import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StepShell } from "@/features/onboarding/components/StepShell";
import { useOnboardingStore } from "@/features/onboarding/store";
import { bodySchema } from "@/features/onboarding/schema";
import { WheelPicker, type WheelItem } from "@/components/ui";
import { space, typography } from "@/theme";

function range(min: number, max: number): WheelItem[] {
  const out: WheelItem[] = [];
  for (let n = min; n <= max; n++) out.push({ value: n, label: String(n) });
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

export default function BasicsStep() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const setBody = useOnboardingStore((s) => s.setBody);

  // Date of birth — split into wheels. Seed from the draft or a 25-y/o default.
  const now = new Date();
  const minYear = now.getFullYear() - 99;
  const maxYear = now.getFullYear() - 13;
  const [sy, sm, sd] = draft.date_of_birth
    ? draft.date_of_birth.split("-").map(Number)
    : [];
  const [year, setYear] = useState<number>(sy ?? now.getFullYear() - 25);
  const [month, setMonth] = useState<number>(sm ?? 1); // 1–12
  const [day, setDay] = useState<number>(sd ?? 1);

  // Wheel-selected — default to sensible mid values (no free-text entry).
  const [height, setHeight] = useState<number>(draft.height_cm ?? 175);
  const [weight, setWeight] = useState<number>(draft.weight_kg ?? 70);

  const monthItems = useMemo<WheelItem[]>(() => {
    const names = t("onboarding.basics.months", {
      returnObjects: true,
    }) as unknown as string[];
    return names.map((label, i) => ({ value: i + 1, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);
  const yearItems = useMemo(() => range(minYear, maxYear), [minYear, maxYear]);
  const dayCount = daysInMonth(year, month);
  const dayItems = useMemo(() => range(1, dayCount), [dayCount]);
  const heightItems = useMemo(() => range(120, 230), []);
  const weightItems = useMemo(() => range(30, 250), []);

  // Changing month/year can shorten the month — clamp the day.
  function onMonth(next: number) {
    setMonth(next);
    setDay((d) => Math.min(d, daysInMonth(year, next)));
  }
  function onYear(next: number) {
    setYear(next);
    setDay((d) => Math.min(d, daysInMonth(next, month)));
  }

  const dob = `${year}-${pad2(month)}-${pad2(day)}`;
  const parsed = bodySchema.safeParse({
    date_of_birth: dob,
    height_cm: height,
    weight_kg: weight,
  });

  function onContinue() {
    if (!parsed.success) return;
    setBody(parsed.data);
    router.push("/(auth)/onboarding/focus");
  }

  return (
    <StepShell
      step={2}
      total={4}
      title={t("onboarding.basics.title")}
      scrollable={false}
      ctaDisabled={!parsed.success}
      onContinue={onContinue}
    >
      <View style={{ flex: 1 }}>
        {/* Top half — date of birth. */}
        <View style={{ flex: 1, justifyContent: "center", gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("onboarding.basics.dob")}</Text>
          <WheelPicker
            columns={[
              { key: "month", items: monthItems, value: month, onChange: onMonth },
              {
                // Remount when the month length changes so the wheel re-snaps.
                key: `day-${year}-${month}`,
                items: dayItems,
                value: day,
                onChange: setDay,
              },
              { key: "year", items: yearItems, value: year, onChange: onYear },
            ]}
          />
        </View>

        {/* Bottom half — height / weight. */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <WheelPicker
            columns={[
              {
                key: "height",
                header: `${t("onboarding.basics.height")} (${t("onboarding.basics.cm")})`,
                items: heightItems,
                value: height,
                onChange: setHeight,
              },
              {
                key: "weight",
                header: `${t("onboarding.basics.weight")} (${t("onboarding.basics.kg")})`,
                items: weightItems,
                value: weight,
                onChange: setWeight,
              },
            ]}
          />
        </View>
      </View>
    </StepShell>
  );
}
