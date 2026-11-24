import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { blobToBase64 } from "@/lib/voice/voice-note";
import { isNativeApp } from "@/lib/native/platform";

export type NativeShareBlobResult = "shared" | "cancelled";

/**
 * Write a blob to app cache and open the OS share sheet.
 * Capacitor WebViews ignore `<a download>` for blob: URLs, so this is the
 * reliable path inside the Android/iOS shells.
 */
export async function shareBlobViaNative(
  blob: Blob,
  fileName: string
): Promise<NativeShareBlobResult | null> {
  if (!isNativeApp()) return null;

  const safeName = fileName.replace(/[^\w.\u0600-\u06FF-]+/g, "_") || "file.bin";
  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: `rootk-exports/${safeName}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title: safeName,
      files: [written.uri],
      dialogTitle: safeName,
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    // Capacitor Share rejects with a plain object / Error on dismiss.
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : String(error ?? "");
    if (/cancel|dismiss|abort/i.test(message)) {
      return "cancelled";
    }
    throw error instanceof Error ? error : new Error(message || "share-failed");
  }
}
