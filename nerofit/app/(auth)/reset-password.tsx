import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { noWebOutline } from "@/lib/style";
import { useAuthStore } from "@/store/auth";
import { colors, fonts, radii, space, typography } from "@/theme";

const MIN_PASSWORD = 6;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const signOut = useAuthStore((s) => s.signOut);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (loading) return;
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t("auth.passwordTooShort", { min: MIN_PASSWORD }));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  // The recovery session could not be established (expired / already used link).
  if (!passwordRecovery && !done) {
    return (
      <Centered>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 24, textAlign: "center" }}>
          {t("auth.resetInvalidTitle")}
        </Text>
        <Text style={[typography.body, { textAlign: "center" }]}>{t("auth.resetInvalidBody")}</Text>
        <Button label={t("auth.backToLogin")} onPress={() => void signOut()} />
      </Centered>
    );
  }

  if (done) {
    return (
      <Centered>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 24, textAlign: "center" }}>
          {t("auth.resetDoneTitle")}
        </Text>
        <Text style={[typography.body, { textAlign: "center" }]}>{t("auth.resetDoneBody")}</Text>
        <Button label={t("auth.backToLogin")} onPress={() => void signOut()} />
      </Centered>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: space[5],
            paddingTop: space[7],
            paddingBottom: space[5],
            gap: space[5],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: space[2] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 28 }}>
              {t("auth.resetTitle")}
            </Text>
            <Text style={typography.body}>{t("auth.resetSubtitle")}</Text>
          </View>

          <View style={{ gap: space[5], marginTop: space[4] }}>
            <Field
              label={t("auth.newPasswordLabel")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
            />
            <Field
              label={t("auth.confirmPasswordLabel")}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t("auth.passwordPlaceholder")}
            />

            {error ? (
              <View
                style={{
                  backgroundColor: colors.elevated,
                  borderRadius: radii.sm,
                  padding: space[3],
                }}
              >
                <Text style={typography.body}>{error}</Text>
              </View>
            ) : null}

            <Button
              label={t("auth.resetSubmit")}
              onPress={onSubmit}
              loading={loading}
              disabled={!password || !confirm}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: space[2] }}>
      <Text style={typography.labelCaps}>{label}</Text>
      <TextInput
        {...input}
        placeholderTextColor={colors.textLo}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="newPassword"
        style={[
          {
            fontFamily: fonts.body,
            color: colors.textHi,
            fontSize: 17,
            paddingVertical: space[2],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          noWebOutline,
        ]}
      />
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: space[5], gap: space[4] }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
