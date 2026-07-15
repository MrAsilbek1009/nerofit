import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react-native";
import { Button, Chip } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useCreateTicket, useMyTickets, useTicketMessages } from "@/lib/queries/support";
import type { SupportStatus, SupportTicket } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

// The chip VALUE is the canonical Uzbek category stored as the ticket subject
// (so the gym's admin panel sees consistent categories); the label is localized.
const CATEGORIES = [
  { value: "To'lov", key: "support.catPayment" },
  { value: "A'zolik", key: "support.catMembership" },
  { value: "Texnik", key: "support.catTechnical" },
  { value: "Mashg'ulot", key: "support.catTraining" },
  { value: "Boshqa", key: "support.catOther" },
] as const;

const STATUS_KEY: Record<SupportStatus, string> = {
  open: "support.statusOpen",
  pending: "support.statusPending",
  resolved: "support.statusResolved",
  closed: "support.statusClosed",
};
function statusColor(s: SupportStatus): string {
  if (s === "resolved") return colors.accent;
  if (s === "closed") return colors.textLo;
  return colors.textHi;
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export default function SupportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const tickets = useMyTickets(userId);
  const create = useCreateTicket(userId);

  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const canSubmit = !!category && description.trim().length > 0 && !create.isPending;

  async function onSubmit() {
    if (!category || !description.trim()) return;
    setError(false);
    try {
      await create.mutateAsync({ subject: category, body: description.trim() });
      setCategory(null);
      setDescription("");
    } catch {
      setError(true);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space[5], paddingVertical: space[3] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.goBack")}>
          <ArrowLeft size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7], gap: space[6] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: space[1] }}>
          <Text style={typography.labelCaps}>{t("support.subtitle")}</Text>
          <Text style={[typography.display, { fontSize: 36, textTransform: "uppercase" }]}>{t("support.title")}</Text>
        </View>

        {/* New ticket */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("support.newTicket")}</Text>

          <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("support.categoryLabel")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
            {CATEGORIES.map((c) => (
              <Chip key={c.value} label={t(c.key)} selected={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </View>

          <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("support.descriptionLabel")}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t("support.descriptionPlaceholder")}
            placeholderTextColor={colors.textLo}
            multiline
            style={{
              fontFamily: fonts.body,
              color: colors.textHi,
              fontSize: 15,
              backgroundColor: colors.elevated,
              borderRadius: radii.md,
              padding: space[4],
              minHeight: 110,
              textAlignVertical: "top",
            }}
          />

          {error ? (
            <Text style={[typography.bodyMuted, { color: colors.textHi }]}>{t("support.submitError")}</Text>
          ) : null}
          <Button label={t("support.submit")} variant="primary" loading={create.isPending} disabled={!canSubmit} onPress={onSubmit} />
        </View>

        {/* My tickets */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("support.myTickets")}</Text>

          {tickets.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : tickets.isError ? (
            <View style={{ alignItems: "center", gap: space[3], paddingVertical: space[5] }}>
              <Text style={typography.bodyMuted}>{t("support.error")}</Text>
              <Button label={t("support.retry")} variant="secondary" fullWidth={false} onPress={() => void tickets.refetch()} />
            </View>
          ) : (tickets.data?.length ?? 0) === 0 ? (
            <Text style={[typography.bodyMuted, { textAlign: "center", paddingVertical: space[5] }]}>{t("support.empty")}</Text>
          ) : (
            tickets.data!.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                open={openId === ticket.id}
                onToggle={() => setOpenId(openId === ticket.id ? null : ticket.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketCard({
  ticket,
  open,
  onToggle,
}: {
  ticket: SupportTicket;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const messages = useTicketMessages(open ? ticket.id : null);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{ backgroundColor: colors.elevated, borderRadius: radii.md, padding: space[4], gap: space[2] }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space[3] }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15, flex: 1 }}>{ticket.subject}</Text>
        <Text style={[typography.labelCaps, { fontSize: 9, color: statusColor(ticket.status) }]}>
          {t(STATUS_KEY[ticket.status])}
        </Text>
      </View>
      <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{fmtDate(ticket.last_reply_at ?? ticket.created_at)}</Text>

      {open ? (
        <View style={{ gap: space[3], marginTop: space[2], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[3] }}>
          {messages.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            (messages.data ?? []).map((m) => (
              <View key={m.id} style={{ gap: 2 }}>
                <Text
                  style={[typography.labelCaps, { fontSize: 9, color: m.author_kind === "staff" ? colors.accent : colors.textLo }]}
                >
                  {m.author_kind === "staff" ? t("support.authorStaff") : t("support.authorYou")}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.textHi, fontSize: 14 }}>{m.body}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </Pressable>
  );
}
