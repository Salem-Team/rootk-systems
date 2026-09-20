"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiMode } from "@/lib/env";
import { getHttpClient } from "@/lib/http-client";
import { formatVoiceDuration } from "@/lib/voice/voice-note";
import { cn } from "@/lib/utils";

export function VoicePlayer({
  src,
  durationMs,
  className,
}: {
  src: string;
  durationMs?: number | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLButtonElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setError(false);
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
    setLoading(true);
    setObjectUrl(null);

    async function resolve() {
      if (!src) {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
        return;
      }
      if (src.startsWith("data:") || src.startsWith("blob:") || !isApiMode()) {
        if (!cancelled) {
          setObjectUrl(src);
          setLoading(false);
        }
        return;
      }
      try {
        const client = getHttpClient();
        const path = src.startsWith("/api/")
          ? src.slice(4)
          : src.startsWith("/")
            ? src
            : `/${src}`;
        const blob = await client.requestBlob(path);
        const url = URL.createObjectURL(blob);
        revoked = url;
        if (!cancelled) {
          setObjectUrl(url);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void resolve();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const dur = audio.duration || (durationMs ? durationMs / 1000 : 0);
      setElapsed(audio.currentTime * 1000);
      setProgress(dur > 0 ? Math.min(1, audio.currentTime / dur) : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [objectUrl, durationMs]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || !objectUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setError(true);
    }
  }

  function seek(clientX: number) {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar) return;
    const dur = audio.duration || (durationMs ? durationMs / 1000 : 0);
    if (!dur) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * dur;
    setProgress(ratio);
    setElapsed(ratio * dur * 1000);
  }

  const labelMs = playing || elapsed > 0 ? elapsed : durationMs ?? 0;
  const remaining =
    durationMs != null && durationMs > 0
      ? Math.max(0, durationMs - labelMs)
      : null;

  return (
    <div
      className={cn(
        "flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.06] to-muted/40 px-2.5 py-2",
        playing && "border-primary/30",
        className
      )}
    >
      {objectUrl ? <audio ref={audioRef} src={objectUrl} preload="metadata" /> : null}
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          "h-10 w-10 shrink-0 touch-manipulation rounded-full shadow-sm",
          playing && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        disabled={!objectUrl || error || loading}
        onClick={() => void toggle()}
        aria-label={playing ? "Pause" : "Play"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ps-0.5" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <button
          ref={barRef}
          type="button"
          disabled={!objectUrl || error}
          aria-label="Seek"
          className="block h-2.5 w-full touch-manipulation overflow-hidden rounded-full bg-border/70 disabled:opacity-50"
          onClick={(e) => seek(e.clientX)}
        >
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </button>
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{error ? "—" : formatVoiceDuration(labelMs)}</span>
          {remaining != null && !error ? (
            <span className="opacity-70">-{formatVoiceDuration(remaining)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
