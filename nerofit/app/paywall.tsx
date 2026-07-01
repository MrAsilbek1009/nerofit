import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useIsElite } from "@/hooks/useEntitlement";
import {
  getCurrentOffering,
  isEliteCustomer,
  purchasePackage,
  restorePurchases,
  type PurchasesPackage,
} from "@/lib/purchases";
import { useEntitlementStore } from "@/store/entitlement";
import { track } from "@/lib/analytics";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const alreadyElite = useIsElite();
  const setRcElite = useEntitlementStore((s) => s.setRcElite);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const offeringQuery = useQuery({
    queryKey: ["rc-offering"],
    queryFn: getCurrentOffering,
    staleTime: 5 * 60 * 1000,
  });

  const purchase = useMutation({
    mutationFn: (pkg: PurchasesPackage) => purchasePackage(pkg),
    onSuccess: (info) => {
      const elite = isEliteCustomer(info);
      setRcElite(elite);
      if (elite) {
        track("subscription_purchased");
        router.back();
      }
    },
    onError: (e: unknown) => {
      // RevenueCat flags user-cancelled purchases — those aren't errors.
      if ((e as { userCancelled?: boolean })?.userCancelled) return;
      Alert.alert(t("paywall.purchaseErrorTitle"), t("paywall.purchaseError"));
    },
  });

  const restore = useMutation({
    mutationFn: restorePurchases,
    onSuccess: (info) => {
      const elite = isEliteCustomer(info);
      setRcElite(elite);
      if (elite) router.back();
      else Alert.alert(t("paywall.restoreNoneTitle"), t("paywall.restoreNone"));
    },
  });

  const benefits = t("paywall.benefits", { returnObjects: true }) as string[];
  const offering = offeringQuery.data;
  const packages = offering?.availablePackages ?? [];
  const selected = packages.find((p) => p.identifier === selectedId) ?? packages[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Close */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: space[4] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("a11y.close")} hitSlop={10}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingBottom: space[6],
          gap: space[5],
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ gap: space[2] }}>
          <Text style={typography.labelCaps}>{t("paywall.eyebrow")}</Text>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 40, letterSpacing: 1 }}>
            {t("paywall.title")}
          </Text>
          <Text style={typography.bodyMuted}>{t("paywall.subtitle")}</Text>
        </View>

        {/* Benefits */}
        <View style={{ gap: space[3] }}>
          {benefits.map((b) => (
            <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <Check size={18} color={colors.accent} />
              <Text style={[typography.body, { color: colors.textHi, flex: 1 }]}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* Body: already elite / loading / offering / unavailable */}
        {alreadyElite ? (
          <View style={{ alignItems: "center", gap: space[2], paddingVertical: space[5] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.accent, fontSize: 22 }}>
              {t("paywall.activeTitle")}
            </Text>
            <Text style={[typography.bodyMuted, { textAlign: "center" }]}>{t("paywall.activeBody")}</Text>
          </View>
        ) : offeringQuery.isLoading ? (
          <View style={{ paddingVertical: space[6], alignItems: "center" }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : packages.length > 0 ? (
          <View style={{ gap: space[4] }}>
            {/* Package options */}
            <View style={{ gap: space[3] }}>
              {packages.map((pkg) => {
                const isSelected = selected?.identifier === pkg.identifier;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelectedId(pkg.identifier)}
                    accessibilityRole="button"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: space[4],
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.border,
                      backgroundColor: colors.elevated,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
                      {pkg.product.title}
                    </Text>
                    <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 16 }}>
                      {pkg.product.priceString}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={t("paywall.subscribe")}
              onPress={() => selected && purchase.mutate(selected)}
              loading={purchase.isPending}
              disabled={!selected}
            />

            <Pressable
              onPress={() => restore.mutate()}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.restorePurchases")}
              style={{ alignSelf: "center", paddingVertical: space[2] }}
            >
              <Text style={[typography.bodyMuted, { fontSize: 13 }]}>
                {restore.isPending ? t("common.loading") : t("paywall.restore")}
              </Text>
            </Pressable>

            <Text style={[typography.bodyMuted, { fontSize: 11, textAlign: "center" }]}>
              {t("paywall.legal")}
            </Text>
          </View>
        ) : (
          // RevenueCat not configured yet / no offering.
          <View style={{ alignItems: "center", gap: space[2], paddingVertical: space[5] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 22 }}>
              {t("paywall.comingSoonTitle")}
            </Text>
            <Text style={[typography.bodyMuted, { textAlign: "center" }]}>{t("paywall.comingSoonBody")}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
