import { Modal, Pressable, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import {
  useWorkoutSettings,
  type WorkoutSettingKey,
} from "@/store/workoutSettings";
import { colors, fonts, radii, space, typography } from "@/theme";

export type WorkoutSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

// In-workout "Workout Settings" sheet: audio cues + auto-pilot, backed by the
// persisted useWorkoutSettings store.
export function WorkoutSettingsSheet({ visible, onClose }: WorkoutSettingsSheetProps) {
  const { t } = useTranslation();
  const s = useWorkoutSettings();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.md,
          borderTopRightRadius: radii.md,
          paddingHorizontal: space[5],
          paddingTop: space[4],
          paddingBottom: space[6],
          gap: space[5],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={typography.h2}>{t("workouts.settings")}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <X size={22} color={colors.textHi} />
          </Pressable>
        </View>

        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("workouts.audio")}</Text>
          <ToggleRow
            label={t("workouts.coaches")}
            value={s.coaches}
            settingKey="coaches"
            onChange={s.setSetting}
          />
          <ToggleRow
            label={t("workouts.exerciseIntro")}
            value={s.exerciseIntro}
            settingKey="exerciseIntro"
            onChange={s.setSetting}
          />
          <ToggleRow
            label={t("workouts.timerSounds")}
            value={s.timerSounds}
            settingKey="timerSounds"
            onChange={s.setSetting}
          />
        </View>

        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("workouts.autoPilot")}</Text>
          <ToggleRow
            label={t("workouts.timedMovements")}
            description={t("workouts.timedMovementsDesc")}
            value={s.autoPilot}
            settingKey="autoPilot"
            onChange={s.setSetting}
          />
        </View>
      </View>
    </Modal>
  );
}

function ToggleRow({
  label,
  description,
  value,
  settingKey,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  settingKey: WorkoutSettingKey;
  onChange: (key: WorkoutSettingKey, value: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}>{label}</Text>
        {description ? (
          <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => onChange(settingKey, v)}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.textHi}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
