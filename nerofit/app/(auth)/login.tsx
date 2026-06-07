import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Apple } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radii, space, typography } from "@/theme";

type Mode = "signIn" | "signUp";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applePressed, setApplePressed] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const { error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    // success → auth gate redirects.
  }

  function onApple() {
    Alert.alert(t("auth.appleStubTitle"), t("auth.appleStubBody"));
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
          {/* Brand */}
          <View style={{ gap: space[1] }}>
            <Text
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 36,
                letterSpacing: 4,
              }}
            >
              {t("brand")}
            </Text>
            <Text style={typography.labelCaps}>{t("tagline")}</Text>
          </View>

          {/* Form */}
          <View style={{ gap: space[5], marginTop: space[6] }}>
            <Field
              label={t("auth.emailLabel")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Field
              label={t("auth.passwordLabel")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
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
              label={mode === "signIn" ? t("auth.logIn") : t("auth.createAccount")}
              onPress={onSubmit}
              loading={loading}
              disabled={!email || !password}
            />

            <Pressable
              onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
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
                {mode === "signIn" ? t("auth.createAccount") : t("auth.logIn")}
              </Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          {/* Apple stub */}
          <Pressable
            onPress={onApple}
            accessibilityRole="button"
            onPressIn={() => setApplePressed(true)}
            onPressOut={() => setApplePressed(false)}
            style={{
              height: 56,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: space[2],
              opacity: applePressed ? 0.85 : 1,
            }}
          >
            <Apple size={18} color={colors.textHi} />
            <Text
              style={{
                fontFamily: fonts.label,
                fontSize: 15,
                color: colors.textHi,
              }}
            >
              {t("auth.apple")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, ...input }: FieldProps) {
  return (
    <View style={{ gap: space[2] }}>
      <Text style={typography.labelCaps}>{label}</Text>
      <TextInput
        {...input}
        placeholderTextColor={colors.textLo}
        style={{
          fontFamily: fonts.body,
          color: colors.textHi,
          fontSize: 17,
          paddingVertical: space[2],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      />
    </View>
  );
}
