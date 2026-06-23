import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { noWebOutline } from "@/lib/style";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL("reset-password"),
      });
      if (error) {
        setError(/rate limit/i.test(error.message) ? t("auth.rateLimited") : error.message);
        return;
      }
      // Always show success even if the email is unknown — don't leak which
      // addresses are registered.
      track("password_reset_requested");
      setSent(true);
    } finally {
      setLoading(false);
    }
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
              {t("auth.forgotTitle")}
            </Text>
            <Text style={typography.body}>{t("auth.forgotSubtitle")}</Text>
          </View>

          {sent ? (
            <View
              style={{
                backgroundColor: colors.elevated,
                borderRadius: radii.sm,
                padding: space[4],
                borderWidth: 1,
                borderColor: colors.accent,
                gap: space[2],
              }}
            >
              <Text style={[typography.body, { color: colors.textHi }]}>
                {t("auth.forgotSent")}
              </Text>
            </View>
          ) : (
            <View style={{ gap: space[5], marginTop: space[4] }}>
              <View style={{ gap: space[2] }}>
                <Text style={typography.labelCaps}>{t("auth.emailLabel")}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={colors.textLo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
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
                label={t("auth.forgotSubmit")}
                onPress={onSubmit}
                loading={loading}
                disabled={!email}
              />
            </View>
          )}

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            accessibilityRole="button"
            style={{ alignSelf: "center", paddingVertical: space[2] }}
          >
            <Text
              style={{
                fontFamily: fonts.label,
                color: colors.accent,
                fontSize: 12,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {t("auth.backToLogin")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
