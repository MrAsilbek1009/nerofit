import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Linking from "expo-linking";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "react-i18next";
import { CalendarClock, Check, CheckCircle2, ChevronDown, Copy, PartyPopper, Snowflake, XCircle } from "lucide-react-native";
import { Button, Chip } from "@/components/ui";
import { copyToClipboard } from "@/lib/clipboard";
import { useUserId } from "@/hooks/useUser";
import type { PaymentProvider } from "@/lib/api/membership";
import {
  isMembershipActive,
  useActiveMembership,
  useMembershipPlans,
  usePayments,
  useStartCashOrder,
  useStartCheckout,
} from "@/lib/queries/membership";
import type { Membership, MembershipPlan } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

// 250000 → "250 000"
function uzs(n: number): string {
  return n.toLocaleString("ru-RU");
}
function daysLeft(endDate: string): number {
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
// Whole days between two ISO dates — a frozen membership's remaining days are
// preserved as of the freeze date (the clock stopped), so measure from there.
function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
// "2026-08-01" → "01.08.2026"
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

const PROVIDERS: PaymentProvider[] = ["payme", "click"];

export default function MembershipScreen() {
  const { t } = useTranslation();
  const userId = useUserId();
  const membership = useActiveMembership(userId);
  const plans = useMembershipPlans();
  const payments = usePayments(userId);
  const checkout = useStartCheckout();
  const cashOrder = useStartCashOrder();

  const [method, setMethod] = useState<"card" | "cash">("card");
  const [provider, setProvider] = useState<PaymentProvider>("payme");
  const [cashOrderState, setCashOrderState] = useState<{ paymentId: string; plan: MembershipPlan } | null>(null);
  const [awaitingPaymentId, setAwaitingPaymentId] = useState<string | null>(null);
  const [congrats, setCongrats] = useState(false);

  const active = isMembershipActive(membership.data);

  // Refresh on focus so a just-activated membership (webhook, admin/SQL) shows
  // up without an app restart.
  useFocusEffect(
    useCallback(() => {
      void membership.refetch();
      void payments.refetch();
    }, [membership, payments]),
  );

  // Celebrate only when the specific order we're waiting on is actually paid —
  // not merely because the member is (already) active. Works for renewals too.
  useEffect(() => {
    if (!awaitingPaymentId) return;
    const paid = (payments.data ?? []).some((p) => p.id === awaitingPaymentId && p.status === "paid");
    if (paid) {
      setCongrats(true);
      setAwaitingPaymentId(null);
      setCashOrderState(null);
    }
  }, [payments.data, awaitingPaymentId]);

  const onCashOrder = useCallback(
    async (plan: MembershipPlan) => {
      try {
        const { payment_id } = await cashOrder.mutateAsync(plan.id);
        setCashOrderState({ paymentId: payment_id, plan });
        setAwaitingPaymentId(payment_id);
      } catch (e) {
        // Surface the real error (e.g. an un-deployed function rejecting cash)
        // so failures aren't silent while the backend is being wired up.
        Alert.alert(
          t("membership.checkoutErrorTitle"),
          e instanceof Error ? e.message : t("membership.checkoutErrorBody"),
        );
      }
    },
    [cashOrder, t],
  );

  const onPay = useCallback(
    async (planId: string) => {
      try {
        const { checkoutUrl, payment_id } = await checkout.mutateAsync({ planId, provider });
        setAwaitingPaymentId(payment_id);
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
      <ScrollView contentContainerStyle={{ padding: space[5], gap: space[5], paddingBottom: space[7] }}>
        <View style={{ gap: space[1] }}>
          <Text style={typography.labelCaps}>{t("membership.subtitle")}</Text>
          <Text style={typography.h1}>{t("membership.title")}</Text>
        </View>

        {membership.isLoading ? (
          <View style={{ paddingTop: space[6], alignItems: "center" }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : active ? (
          <ActiveCard endDate={membership.data!.end_date!} userId={userId!} />
        ) : membership.data?.status === "frozen" ? (
          <FrozenCard membership={membership.data} />
        ) : (
          <InactiveBanner
            title={t("membership.inactiveTitle")}
            body={t("membership.inactiveBody")}
          />
        )}

        {/* Tariffs — always visible so members can renew / upgrade too */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("membership.plansTitle")}</Text>

          <View style={{ gap: space[2] }}>
            <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("membership.methodLabel")}</Text>
            <View style={{ flexDirection: "row", gap: space[2] }}>
              <Chip label={t("membership.methodCard")} selected={method === "card"} onPress={() => setMethod("card")} />
              <Chip label={t("membership.methodCash")} selected={method === "cash"} onPress={() => setMethod("cash")} />
            </View>
            {method === "card" ? (
              <View style={{ flexDirection: "row", gap: space[2], marginTop: space[1] }}>
                {PROVIDERS.map((p) => (
                  <Chip
                    key={p}
                    label={p === "payme" ? "Payme" : "Click"}
                    selected={provider === p}
                    onPress={() => setProvider(p)}
                  />
                ))}
              </View>
            ) : null}
          </View>

          {plans.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            (plans.data ?? []).map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                cta={method === "cash" ? t("membership.cashCta") : t("membership.pay")}
                loading={method === "cash" ? cashOrder.isPending && cashOrder.variables === p.id : pendingPlanId === p.id}
                disabled={checkout.isPending || cashOrder.isPending}
                onPay={() => (method === "cash" ? onCashOrder(p) : onPay(p.id))}
              />
            ))
          )}
        </View>

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

      <CongratsOverlay visible={congrats} onClose={() => setCongrats(false)} />
      <CashOrderModal order={cashOrderState} onClose={() => setCashOrderState(null)} />
    </SafeAreaView>
  );
}

function CashOrderModal({
  order,
  onClose,
}: {
  order: { paymentId: string; plan: MembershipPlan } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.9)",
          alignItems: "center",
          justifyContent: "center",
          padding: space[6],
          gap: space[4],
        }}
      >
        {order ? (
          <>
            <Text style={typography.h2}>{t("membership.cashTitle")}</Text>
            {/* "order:" prefix lets the staff panel tell an order QR apart from a
                member QR (both are UUIDs). Panel strips it before order_detail. */}
            <View style={{ backgroundColor: "#fff", padding: space[3], borderRadius: radii.sm }}>
              <QRCode value={`order:${order.paymentId}`} size={180} />
            </View>
            <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16, textAlign: "center" }}>
              {order.plan.name_uz} · {uzs(order.plan.price_app_uzs)} so&apos;m
            </Text>
            <Text style={[typography.bodyMuted, { textAlign: "center", fontSize: 13 }]}>
              {t("membership.cashInstruction")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
              <ActivityIndicator color={colors.accent} />
              <Text style={typography.labelCaps}>{t("membership.cashPending")}</Text>
            </View>
            <Button label={t("membership.close")} variant="secondary" fullWidth={false} onPress={onClose} />
          </>
        ) : null}
      </View>
    </Modal>
  );
}

function ActiveCard({ endDate, userId }: { endDate: string; userId: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copyId() {
    // The id Text is selectable, so if the native clipboard module is missing
    // (older dev client) the user can still copy manually — just skip the badge.
    if (!(await copyToClipboard(userId))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
        <Text style={[typography.labelCaps, { color: colors.accent }]}>{t("membership.statusActive")}</Text>
      </View>

      {/* QR — gym staff scans this (user id) */}
      <View style={{ backgroundColor: "#fff", padding: space[3], borderRadius: radii.sm }}>
        <QRCode value={userId} size={180} />
      </View>
      <Text style={[typography.bodyMuted, { fontSize: 12, textAlign: "center" }]}>{t("membership.qrHint")}</Text>

      {/* Member ID + copy — read out / copy if the QR scan fails at the desk */}
      <View style={{ alignItems: "center", gap: space[2] }}>
        <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("membership.memberId")}</Text>
        <Text selectable style={{ fontFamily: fonts.body, color: colors.textLo, fontSize: 12, textAlign: "center" }}>
          {userId}
        </Text>
        <Pressable
          onPress={copyId}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space[2],
            backgroundColor: colors.surface,
            borderRadius: radii.pill,
            paddingHorizontal: space[3],
            paddingVertical: space[2],
          }}
        >
          {copied ? <Check size={14} color={colors.accent} /> : <Copy size={14} color={colors.textHi} />}
          <Text style={{ fontFamily: fonts.label, fontSize: 12, color: copied ? colors.accent : colors.textHi }}>
            {copied ? t("membership.copied") : t("membership.copy")}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <CalendarClock size={16} color={colors.textLo} />
        <Text style={typography.body}>
          {t("membership.until")} {fmtDate(endDate)} · {t("membership.daysLeft", { n: daysLeft(endDate) })}
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
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}>{title}</Text>
        <Text style={[typography.bodyMuted, { fontSize: 13 }]}>{body}</Text>
      </View>
    </View>
  );
}

// Frozen membership: the clock is paused (staff-initiated). Read-only in the app
// — no QR (entry is denied while frozen); staff unfreeze it at the desk. Shows
// the days that stay preserved for when it resumes.
function FrozenCard({ membership }: { membership: Membership }) {
  const { t } = useTranslation();
  const saved =
    membership.frozen_at && membership.end_date
      ? daysBetween(membership.frozen_at, membership.end_date)
      : null;
  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[5],
        gap: space[3],
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <Snowflake size={18} color={colors.textLo} />
        <Text style={typography.labelCaps}>{t("membership.statusFrozen")}</Text>
      </View>
      {saved != null ? (
        <Text style={typography.body}>{t("membership.frozenDaysSaved", { n: saved })}</Text>
      ) : null}
      <Text style={[typography.bodyMuted, { fontSize: 13, textAlign: "center" }]}>
        {t("membership.frozenBody")}
      </Text>
    </View>
  );
}

function PlanCard({
  plan,
  cta,
  loading,
  disabled,
  onPay,
}: {
  plan: MembershipPlan;
  cta: string;
  loading: boolean;
  disabled: boolean;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const includes = t("membership.includes", { returnObjects: true }) as string[];
  const benefits = [t("membership.durationDays", { n: plan.duration_days }), ...includes];

  return (
    <View style={{ backgroundColor: colors.elevated, borderRadius: radii.md, padding: space[4], gap: space[2] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>{plan.name_uz}</Text>
        <Text style={{ fontFamily: fonts.display, color: colors.accent, fontSize: 22 }}>
          {uzs(plan.price_app_uzs)}
        </Text>
      </View>
      <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("membership.appPrice")}</Text>
      <Text style={[typography.bodyMuted, { fontSize: 12, textDecorationLine: "line-through" }]}>
        {t("membership.gymPrice", { price: uzs(plan.price_gym_uzs) })}
      </Text>

      {/* See details — collapsible checklist of what the plan includes */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[1] }}
      >
        <Text style={[typography.labelCaps, { color: colors.accent }]}>
          {open ? t("membership.seeLess") : t("membership.seeMore")}
        </Text>
        <ChevronDown
          size={16}
          color={colors.accent}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {open ? (
        <View style={{ gap: space[2], paddingBottom: space[1] }}>
          {benefits.map((b, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
              <CheckCircle2 size={16} color={colors.accent} />
              <Text style={{ fontFamily: fonts.body, color: colors.textHi, fontSize: 13, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button label={cta} variant="primary" loading={loading} disabled={disabled} onPress={onPay} />
    </View>
  );
}

function CongratsOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const anim = useRef(new Animated.Value(0)).current;
  // Fixed confetti angles/colors so the burst is stable across renders.
  const confetti = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2,
        color: [colors.accent, colors.textHi, colors.textLo][i % 3]!,
        dist: 70 + (i % 3) * 18,
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 70 }).start();
  }, [visible, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.85)",
          alignItems: "center",
          justifyContent: "center",
          padding: space[6],
          gap: space[5],
        }}
      >
        <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
          {confetti.map((c, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                width: 7,
                height: 7,
                borderRadius: 2,
                backgroundColor: c.color,
                opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: Animated.multiply(anim, Math.cos(c.angle) * c.dist) },
                  { translateY: Animated.multiply(anim, Math.sin(c.angle) * c.dist) },
                  { scale },
                ],
              }}
            />
          ))}
          <Animated.View
            style={{
              width: 88,
              height: 88,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale }],
            }}
          >
            <PartyPopper size={44} color={colors.canvas} />
          </Animated.View>
        </View>

        <View style={{ gap: space[2], alignItems: "center" }}>
          <Text style={[typography.h1, { textAlign: "center" }]}>{t("membership.congratsTitle")}</Text>
          <Text style={[typography.bodyMuted, { textAlign: "center" }]}>{t("membership.congratsBody")}</Text>
        </View>

        <Button label={t("membership.viewQr")} onPress={onClose} fullWidth={false} />
      </View>
    </Modal>
  );
}
