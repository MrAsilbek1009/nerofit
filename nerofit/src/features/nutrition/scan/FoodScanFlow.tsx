import { useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  type BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Images } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import {
  useAnalyzeFoodPhoto,
  useBarcodeLookup,
  useLogScannedMeal,
} from "@/lib/queries/nutrition";
import type { FoodScanResult } from "@/lib/api/foodScan";
import { track } from "@/lib/analytics";
import { colors, radii, space, typography } from "@/theme";
import { CloseButton } from "./CloseButton";
import { ModeToggle, type ScanMode } from "./ModeToggle";
import { prepareImage } from "./prepareImage";
import { ResultStage } from "./ResultStage";
import { emptyMacros } from "./scanUtils";
import { SearchStage } from "./SearchStage";

type Stage = "input" | "analyzing" | "result" | "error";

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

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
  // Guards against the barcode scanner firing repeatedly for one code.
  const scanLock = useRef(false);

  const analyze = useAnalyzeFoodPhoto();
  const barcode = useBarcodeLookup();
  const logScanned = useLogScannedMeal(userId);

  const [mode, setMode] = useState<ScanMode>("photo");
  const [stage, setStage] = useState<Stage>("input");
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

  function close() {
    router.back();
  }

  function retake() {
    setResult(null);
    setPrepared(null);
    setPreviewUri(null);
    setErrorMsg(null);
    scanLock.current = false;
    setStage("input");
  }

  function changeMode(next: ScanMode) {
    scanLock.current = false;
    setErrorMsg(null);
    setMode(next);
    setStage("input");
  }

  // ---- Photo (AI) ----
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

  // ---- Barcode (OpenFoodFacts) ----
  function onBarcode(res: BarcodeScanningResult) {
    if (scanLock.current || busy) return;
    scanLock.current = true;
    setPreviewUri(null);
    setStage("analyzing");
    barcode.mutate(res.data, {
      onSuccess: (r) => {
        if (r) {
          track("food_barcode_scanned", { found: true });
          setResult(r);
          setStage("result");
        } else {
          track("food_barcode_scanned", { found: false });
          setErrorMsg(t("nutrition.scan.barcodeNotFound"));
          setStage("error");
        }
      },
      onError: (e) => {
        setErrorMsg(errorText(e));
        setStage("error");
      },
    });
  }

  // ---- Search (OpenFoodFacts) ----
  function onPickSearch(r: FoodScanResult) {
    setPreviewUri(null);
    setResult(r);
    setStage("result");
  }

  const topBar = (
    <View style={{ paddingTop: insets.top + space[2], paddingBottom: space[3], alignItems: "center" }}>
      <ModeToggle mode={mode} onChange={changeMode} />
      <CloseButton top={insets.top + space[2]} onPress={close} />
    </View>
  );

  // ---- Input stage (mode-dependent) ----
  if (stage === "input") {
    if (mode === "search") {
      return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          {topBar}
          <SearchStage onPick={onPickSearch} />
        </View>
      );
    }

    // Camera modes: photo | barcode
    if (!permission) {
      return (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {topBar}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          {topBar}
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
              {mode === "photo" ? (
                <Button label={t("nutrition.scan.gallery")} variant="secondary" onPress={onPickGallery} />
              ) : null}
              <Button
                label={t("nutrition.scan.modes.search")}
                variant="secondary"
                onPress={() => changeMode("search")}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={
            mode === "barcode" ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
          }
          onBarcodeScanned={mode === "barcode" ? onBarcode : undefined}
        />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {topBar}

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                width: mode === "barcode" ? "82%" : "78%",
                aspectRatio: mode === "barcode" ? undefined : 1,
                height: mode === "barcode" ? 120 : undefined,
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
              {mode === "barcode" ? t("nutrition.scan.barcodeHint") : t("nutrition.scan.hint")}
            </Text>
          </View>

          {mode === "photo" ? (
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

              <View style={{ width: 52, height: 52 }} />
            </View>
          ) : (
            <View style={{ paddingBottom: insets.bottom + space[6] }} />
          )}
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
