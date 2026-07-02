import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "react-i18next";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react-native";
import { Button, Chip } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import type { PaymentProvider } from "@/lib/api/membership";
import {
  isMembershipActive,
  useActiveMembership,
  useMembershipPlans,
  usePayments,
  useStartCheckout,
} from "@/lib/queries/membership";
import type { MembershipPlan } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

// 250000 → "250 000"
function uzs(n: number): string {
  return n.toLocaleString("ru-RU");
}
function daysLeft(endDate: string): number {
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

const PROVIDERS: PaymentProvider[] = ["payme", "click"];

export default function MembershipScreen() {
  const { t } = useTranslation();
  const userId = useUserId();
  const membership = useActiveMembership(userId);
  const plans = useMembershipPlans();
  const payments = usePayments(userId);
  const checkout = useStartCheckout();

  const [provider, setProvider] = useState<PaymentProvider>("payme");

  const active = isMembershipActive(membership.data);

  // Refresh on focus so a just-activated membership (webhook, admin/SQL) shows
  // up without an app restart.
  useFocusEffect(
    useCallback(() => {
      void membership.refetch();
      void payments.refetch();
    }, [membership, payments]),
  );

  const onPay = useCallback(
    async (planId: string) => {
      try {
        const { checkoutUrl } = await checkout.mutateAsync({ planId, provider });
        await Linking.openURL(checkoutUrl);
      } catch {
        Alert.alert(t("membership.checkoutErrorTitle"), t("membership.checkoutErrorBody"));
      }
    },
    [checkout, provider, t],
  );

  const pendingPlanId = checkout.isPending ? checkout.variables?.planId : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: space[5], gap: space[5], paddingBottom: space[7] }}
      >
        <View style={{ gap: space[1] }}>
          <Text style={typography.labelCaps}>{t("membership.subtitle")}</Text>
          <Text style={typography.h1}>{t("membership.title")}</Text>
        </View>

        {membership.isLoading ? (
          <View style={{ paddingTop: space[6], alignItems: "center" }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : active ? (
          <ActiveCard
            endDate={membership.data!.end_date!}
            userId={userId!}
            statusLabel={t("membership.statusActive")}
            leftLabel={t("membership.daysLeft", { n: daysLeft(membership.data!.end_date!) })}
            untilLabel={t("membership.until")}
            qrHint={t("membership.qrHint")}
          />
        ) : (
          <InactiveBanner
            title={t("membership.inactiveTitle")}
            body={t("membership.inactiveBody")}
          />
        )}

        {/* Tariffs — always visible so members can renew / upgrade too */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("membership.plansTitle")}</Text>

          {/* Payment method selector — chartreuse on the selected chip only. */}
          <View style={{ gap: space[2] }}>
            <Text style={[typography.labelCaps, { fontSize: 9 }]}>
              {t("membership.providerLabel")}
            </Text>
            <View style={{ flexDirection: "row", gap: space[2] }}>
              {PROVIDERS.map((p) => (
                <Chip
                  key={p}
                  label={p === "payme" ? "Payme" : "Click"}
                  selected={provider === p}
                  onPress={() => setProvider(p)}
                />
              ))}
            </View>
          </View>

          {plans.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            (plans.data ?? []).map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                appLabel={t("membership.appPrice")}
                gymLabel={t("membership.gymPrice", { price: uzs(p.price_gym_uzs) })}
                cta={t("membership.pay")}
                loading={pendingPlanId === p.id}
                disabled={checkout.isPending}
                onPay={() => onPay(p.id)}
              />
            ))
          )}
        </View>

        {/* Payment history */}
        {(payments.data?.length ?? 0) > 0 ? (
          <View style={{ gap: space[3] }}>
            <Text style={typography.labelCaps}>{t("membership.historyTitle")}</Text>
            {payments.data!.map((pay) => (
              <View
                key={pay.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: colors.elevated,
                  borderRadius: radii.md,
                  padding: space[4],
                }}
              >
                <Text style={typography.body}>{`${uzs(pay.amount_uzs)} so'm`}</Text>
                <Text style={typography.bodyMuted}>
                  {pay.provider} · {pay.status}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveCard({
  endDate,
  userId,
  statusLabel,
  leftLabel,
  untilLabel,
  qrHint,
}: {
  endDate: string;
  userId: string;
  statusLabel: string;
  leftLabel: string;
  untilLabel: string;
  qrHint: string;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[5],
        gap: space[4],
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <CheckCircle2 size={18} color={colors.accent} />
        <Text style={[typography.labelCaps, { color: colors.accent }]}>{statusLabel}</Text>
      </View>

      {/* QR — gym staff scans this (user id) */}
      <View style={{ backgroundColor: "#fff", padding: space[3], borderRadius: radii.sm }}>
        <QRCode value={userId} size={180} />
      </View>
      <Text style={[typography.bodyMuted, { fontSize: 12, textAlign: "center" }]}>{qrHint}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <CalendarClock size={16} color={colors.textLo} />
        <Text style={typography.body}>
          {untilLabel} {endDate} · {leftLabel}
        </Text>
      </View>
    </View>
  );
}

function InactiveBanner({ title, body }: { title: string; body: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[5],
        gap: space[2],
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <XCircle size={22} color={colors.textLo} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}>
          {title}
        </Text>
        <Text style={[typography.bodyMuted, { fontSize: 13 }]}>{body}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  appLabel,
  gymLabel,
  cta,
  loading,
  disabled,
  onPay,
}: {
  plan: MembershipPlan;
  appLabel: string;
  gymLabel: string;
  cta: string;
  loading: boolean;
  disabled: boolean;
  onPay: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[4],
        gap: space[2],
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
          {plan.name_uz}
        </Text>
        <Text style={{ fontFamily: fonts.display, color: colors.accent, fontSize: 22 }}>
          {uzs(plan.price_app_uzs)}
        </Text>
      </View>
      <Text style={[typography.labelCaps, { fontSize: 9 }]}>{appLabel}</Text>
      <Text style={[typography.bodyMuted, { fontSize: 12, textDecorationLine: "line-through" }]}>
        {gymLabel}
      </Text>
      <Button label={cta} variant="primary" loading={loading} disabled={disabled} onPress={onPay} />
    </View>
  );
}
