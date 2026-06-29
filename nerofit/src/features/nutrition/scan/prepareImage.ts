import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_EDGE = 1500;

export type PreparedImage = {
  uri: string;
  base64: string;
  mediaType: "image/jpeg";
};

/**
 * Downscale the longer edge to <= 1500px and JPEG-compress, returning base64.
 * Keeps the upload under Claude Haiku's ~2MP sweet spot (lower latency + cost)
 * and normalizes HEIC/PNG to JPEG so the Edge Function always receives
 * `image/jpeg`. Never upscales — small photos pass through untouched.
 */
export async function prepareImage(
  uri: string,
  width?: number,
  height?: number,
): Promise<PreparedImage> {
  const longer = Math.max(width ?? 0, height ?? 0);
  const resizeBy =
    longer > MAX_EDGE
      ? (width ?? 0) >= (height ?? 0)
        ? { width: MAX_EDGE }
        : { height: MAX_EDGE }
      : null;

  const context = ImageManipulator.manipulate(uri);
  if (resizeBy) context.resize(resizeBy);
  const ref = await context.renderAsync();
  const result = await ref.saveAsync({
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });

  return {
    uri: result.uri,
    base64: result.base64 ?? "",
    mediaType: "image/jpeg",
  };
}
