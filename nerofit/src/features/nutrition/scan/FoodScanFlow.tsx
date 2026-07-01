import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Images, X } from "lucide-react-native";
import { Button, Chip } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useAnalyzeFoodPhoto, useLogScannedMeal } from "@/lib/queries/nutrition";
import type { FoodScanMacros, FoodScanResult } from "@/lib/api/foodScan";
import type { MealSlot } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";
import { prepareImage } from "./prepareImage";
import { Stepper } from "./Stepper";

type Stage = "camera" | "analyzing" | "result" | "error";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

function defaultSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function emptyMacros(): FoodScanMacros {
  return { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
}

// The model occasionally drops a field — coerce to a safe, displayable shape.
function normalize(r: FoodScanResult): FoodScanResult {
  const items = Array.isArray(r?.items) ? r.items : [];
  const total =
    r?.total ??
    items.reduce(
      (a, i) => ({
        kcal: a.kcal + (i.kcal || 0),
        protein_g: a.protein_g + (i.protein_g || 0),
        carbs_g: a.carbs_g + (i.carbs_g || 0),
        fats_g: a.fats_g + (i.fats_g || 0),
      }),
      emptyMacros(),
    );
  const confidence = (["high", "medium", "low"] as const).includes(r?.confidence)
    ? r.confidence
    : "low";
  return { items, total, confidence, notes: r?.notes ?? "" };
}

export function FoodScanFlow() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useUserId();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const analyze = useAnalyzeFoodPhoto();
  const logScanned = useLogScannedMeal(userId);

  const [stage, setStage] = useState<Stage>("camera");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ base64: string; mediaType: string } | null>(null);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function errorText(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    if (/429|rate_limited/i.test(msg)) return t("nutrition.scan.rateLimited");
    return t("nutrition.scan.errorBody");
  }

  function runAnalysis(prep: { base64: string; mediaType: string }) {
    analyze.mutate(
      { imageBase64: prep.base64, mediaType: prep.mediaType },
      {
        onSuccess: (r) => {
          setResult(normalize(r));
          setStage("result");
        },
        onError: (e) => {
          setErrorMsg(errorText(e));
          setStage("error");
        },
      },
    );
  }

  async function startAnalysis(uri: string, width?: number, height?: number) {
    setPreviewUri(uri);
    setStage("analyzing");
    try {
      const prep = await prepareImage(uri, width, height);
      setPrepared({ base64: prep.base64, mediaType: prep.mediaType });
      runAnalysis(prep);
    } catch (e) {
      setErrorMsg(errorText(e));
      setStage("error");
    }
  }

  async function onCapture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) await startAnalysis(photo.uri, photo.width, photo.height);
    } catch (e) {
      setErrorMsg(errorText(e));
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  async function onPickGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    await startAnalysis(asset.uri, asset.width, asset.height);
  }

  function close() {
    router.back();
  }

  function retake() {
    setResult(null);
    setPrepared(null);
    setPreviewUri(null);
    setErrorMsg(null);
    setStage("camera");
  }

  // ---- Camera (incl. permission gate) ----
  if (stage === "camera") {
    if (!permission) {
      return (
        <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          <CloseButton top={insets.top + space[2]} onPress={close} />
          <View style={{ flex: 1, justifyContent: "center", padding: space[5], gap: space[4] }}>
            <Text style={[typography.h1, { textTransform: "uppercase" }]}>
              {t("nutrition.scan.permissionTitle")}
            </Text>
            <Text style={typography.bodyMuted}>{t("nutrition.scan.permissionBody")}</Text>
            <View style={{ gap: space[3], marginTop: space[3] }}>
              <Button
                label={t("nutrition.scan.grantAccess")}
                onPress={() => {
                  if (permission.canAskAgain) void requestPermission();
                  else void Linking.openSettings();
                }}
              />
              <Button
                label={t("nutrition.scan.gallery")}
                variant="secondary"
                onPress={onPickGallery}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        {/* Overlay */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <CloseButton top={insets.top + space[2]} onPress={close} />

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                width: "78%",
                aspectRatio: 1,
                borderRadius: radii.md,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.7)",
              }}
            />
            <Text
              style={[
                typography.labelCaps,
                { color: "rgba(255,255,255,0.85)", marginTop: space[4] },
              ]}
            >
              {t("nutrition.scan.hint")}
            </Text>
          </View>

          {/* Controls */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: space[6],
              paddingBottom: insets.bottom + space[5],
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("nutrition.scan.gallery")}
              onPress={onPickGallery}
              style={{
                width: 52,
                height: 52,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.4)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Images size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("nutrition.scan.capture")}
              onPress={onCapture}
              disabled={busy}
              style={{
                width: 78,
                height: 78,
                borderRadius: 39,
                borderWidth: 4,
                borderColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" }} />
            </Pressable>

            {/* Spacer to balance the gallery button */}
            <View style={{ width: 52, height: 52 }} />
          </View>
        </View>
      </View>
    );
  }

  // ---- Analyzing ----
  if (stage === "analyzing") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={{ flex: 1, opacity: 0.5 }} resizeMode="cover" />
        ) : null}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            gap: space[4],
          }}
        >
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[typography.labelCaps, { color: "#FFFFFF" }]}>
            {t("nutrition.scan.analyzing")}
          </Text>
        </View>
        <CloseButton top={insets.top + space[2]} onPress={close} />
      </View>
    );
  }

  // ---- Error ----
  if (stage === "error") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <CloseButton top={insets.top + space[2]} onPress={close} />
        <View style={{ flex: 1, justifyContent: "center", padding: space[5], gap: space[4] }}>
          <Text style={[typography.h1, { textTransform: "uppercase" }]}>
            {t("nutrition.scan.errorTitle")}
          </Text>
          <Text style={typography.bodyMuted}>{errorMsg ?? t("nutrition.scan.errorBody")}</Text>
          <View style={{ gap: space[3], marginTop: space[3] }}>
            {prepared ? (
              <Button
                label={t("nutrition.scan.retry")}
                onPress={() => {
                  setStage("analyzing");
                  runAnalysis(prepared);
                }}
              />
            ) : null}
            <Button label={t("nutrition.scan.retake")} variant="secondary" onPress={retake} />
          </View>
        </View>
      </View>
    );
  }

  // ---- Result ----
  return (
    <ResultStage
      previewUri={previewUri}
      result={result ?? { items: [], total: emptyMacros(), confidence: "low", notes: "" }}
      saving={logScanned.isPending}
      insetTop={insets.top + space[2]}
      insetBottom={insets.bottom + space[4]}
      onClose={close}
      onRetake={retake}
      onAdd={(entry) => logScanned.mutate(entry, { onSuccess: close })}
    />
  );
}

function ResultStage({
  previewUri,
  result,
  saving,
  insetTop,
  insetBottom,
  onClose,
  onRetake,
  onAdd,
}: {
  previewUri: string | null;
  result: FoodScanResult;
  saving: boolean;
  insetTop: number;
  insetBottom: number;
  onClose: () => void;
  onRetake: () => void;
  onAdd: (entry: {
    name: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    slot: MealSlot;
  }) => void;
}) {
  const { t } = useTranslation();
  const defaultName = result.items[0]?.name || t("nutrition.scan.defaultName");
  const [name, setName] = useState(defaultName);
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());

  const scaled = (n: number) => Math.round((n || 0) * servings);
  const total = result.total;
  const g = t("nutrition.g").toUpperCase();

  const confidenceLabel = t(`nutrition.scan.confidence.${result.confidence}`);

  function submit() {
    onAdd({
      name: name.trim() || defaultName,
      kcal: scaled(total.kcal),
      protein_g: scaled(total.protein_g),
      carbs_g: scaled(total.carbs_g),
      fats_g: scaled(total.fats_g),
      slot,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space[7] }}>
        <View>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={{ width: "100%", height: 300 }} resizeMode="cover" />
          ) : (
            <View style={{ width: "100%", height: 300, backgroundColor: colors.elevated }} />
          )}
          <CloseButton top={insetTop} onPress={onClose} />
        </View>

        <View style={{ padding: space[5], gap: space[5] }}>
          {/* Estimate + confidence */}
          <View style={{ gap: space[1] }}>
            <Text style={typography.labelCaps}>
              {t("nutrition.scan.estimate")} · {confidenceLabel}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("nutrition.scan.mealNamePlaceholder")}
              placeholderTextColor={colors.textLo}
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 28,
                paddingVertical: space[1],
              }}
            />
          </View>

          {/* Calories + macros */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
                {scaled(total.kcal)}
              </Text>
              <Text style={typography.labelCaps}>{t("nutrition.kcal").toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: space[5] }}>
              <MacroStat label={t("nutrition.protein")} value={`${scaled(total.protein_g)}${g}`} />
              <MacroStat label={t("nutrition.carbs")} value={`${scaled(total.carbs_g)}${g}`} />
              <MacroStat label={t("nutrition.fats")} value={`${scaled(total.fats_g)}${g}`} />
            </View>
          </View>

          {/* Servings */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[typography.labelCaps, { color: colors.textHi }]}>
              {t("nutrition.scan.servings")}
            </Text>
            <Stepper value={servings} onChange={setServings} format={(v) => String(v)} />
          </View>

          {/* Detected items */}
          {result.items.length > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("nutrition.scan.detected")}</Text>
              {result.items.map((item, i) => (
                <View
                  key={`${item.name}-${i}`}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.portion ? <Text style={typography.bodyMuted}>{item.portion}</Text> : null}
                  </View>
                  <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
                    {scaled(item.kcal)} {t("nutrition.kcal").toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Slot */}
          <View style={{ gap: space[3] }}>
            <Text style={typography.labelCaps}>{t("nutrition.scan.addToMeal")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
              {SLOTS.map((s) => (
                <Chip
                  key={s}
                  label={t(`nutrition.slots.${s}`)}
                  selected={slot === s}
                  onPress={() => setSlot(s)}
                />
              ))}
            </View>
          </View>

          {result.notes ? (
            <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>{result.notes}</Text>
          ) : null}

          {/* Actions */}
          <View style={{ gap: space[3], marginTop: space[2] }}>
            <Button
              label={t("nutrition.scan.addToLog")}
              loading={saving}
              onPress={submit}
            />
            <Button label={t("nutrition.scan.retake")} variant="secondary" onPress={onRetake} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 15 }}>{value}</Text>
      <Text style={[typography.labelCaps, { fontSize: 10 }]}>{label}</Text>
    </View>
  );
}

function CloseButton({ top, onPress }: { top: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("a11y.close")}
      onPress={onPress}
      hitSlop={10}
      style={{
        position: "absolute",
        top,
        left: space[4],
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <X size={22} color="#FFFFFF" />
    </Pressable>
  );
}
