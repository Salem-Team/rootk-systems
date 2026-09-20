"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoicePlayer } from "@/components/voice/voice-player";
import { useTranslation } from "@/hooks/use-translation";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_DURATION_MS,
  VOICE_MIN_DURATION_MS,
  blobToBase64,
  formatVoiceDuration,
  pickRecorderMime,
} from "@/lib/voice/voice-note";
import { cn } from "@/lib/utils";

export type VoiceDraft = {
  dataBase64: string;
  mime: string;
  durationMs: number;
  previewUrl: string;
};

export function VoiceRecorderControl({
  value,
  onChange,
  disabled,
  compact,
  className,
}: {
  value: VoiceDraft | null;
  onChange: (next: VoiceDraft | null) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (value?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(value.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("workComments.voiceUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finalize(recorder.mimeType || mime);
      };
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      recorder.start(250);
      tickRef.current = window.setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsed(ms);
        if (ms >= VOICE_MAX_DURATION_MS) stop();
      }, 200);
    } catch {
      setError(t("workComments.voicePermission"));
      stopTracks();
    }
  }

  function stop() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
    stopTracks();
  }

  async function finalize(mime: string) {
    const durationMs = Date.now() - startedAtRef.current;
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
    chunksRef.current = [];
    if (durationMs < VOICE_MIN_DURATION_MS || blob.size < 64) {
      setError(t("workComments.voiceTooShort"));
      return;
    }
    if (blob.size > VOICE_MAX_BYTES) {
      setError(t("workComments.voiceTooLarge"));
      return;
    }
    const dataBase64 = await blobToBase64(blob);
    const previewUrl = URL.createObjectURL(blob);
    if (value?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(value.previewUrl);
    onChange({ dataBase64, mime: mime || "audio/webm", durationMs, previewUrl });
  }

  function clear() {
    if (value?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    setError(null);
  }

  const ratio = Math.min(1, elapsed / VOICE_MAX_DURATION_MS);

  return (
    <div className={cn("grid gap-2", className)}>
      {value ? (
        <div className="flex items-stretch gap-2">
          <VoicePlayer
            src={value.previewUrl}
            durationMs={value.durationMs}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-12 w-12 shrink-0 touch-manipulation rounded-2xl text-destructive"
            disabled={disabled}
            onClick={clear}
            aria-label={t("workComments.removeVoice")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            className={cn(
              "relative h-12 min-w-0 touch-manipulation gap-2 overflow-hidden rounded-2xl px-3 text-[13px] font-semibold",
              recording && "border-destructive"
            )}
            disabled={disabled}
            onClick={() => (recording ? stop() : void start())}
          >
            {recording ? (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                <Square className="relative h-3.5 w-3.5 fill-current" />
              </span>
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="min-w-0 truncate">
              {recording
                ? t("workComments.stopRecording")
                : t("workComments.recordVoice")}
            </span>
            {recording ? (
              <span className="ms-auto font-mono text-[12px] tabular-nums">
                {formatVoiceDuration(elapsed)}
              </span>
            ) : null}
          </Button>
          {recording ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-destructive/15">
              <div
                className="h-full rounded-full bg-destructive transition-[width] duration-200"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="text-[12px] leading-snug text-destructive">{error}</p>
      ) : !compact && !value && !recording ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("workComments.voiceHint")}
        </p>
      ) : null}
    </div>
  );
}
