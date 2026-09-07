"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function beep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // Audio is a nice-to-have; ignore failures (autoplay policy, no device).
  }
}

function clock(seconds: number) {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/**
 * A countdown started when a set is marked done. `startedNonce` changes every
 * time a new rest begins, which remounts the internal timer via `key`.
 */
export function RestTimer({
  seconds,
  onDismiss,
}: {
  seconds: number;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const adjustRef = useRef(0);
  const firedRef = useRef(false);

  useEffect(() => {
    let target = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      target += adjustRef.current * 1000;
      adjustRef.current = 0;
      const left = Math.round((target - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        beep();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(200);
        }
      } else if (left > 0) {
        firedRef.current = false;
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);

  const adjust = (delta: number) => {
    adjustRef.current += delta;
    setRemaining((r) => r + delta);
  };

  const overrun = remaining < 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">Hvile</span>
      <span
        className={
          "font-mono text-lg font-semibold tabular-nums " +
          (overrun ? "text-muted-foreground" : "text-foreground")
        }
      >
        {overrun ? `+${clock(-remaining)}` : clock(remaining)}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => adjust(-15)}
          aria-label="15 sekunder mindre"
        >
          <Minus />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => adjust(15)}
          aria-label="15 sekunder mere"
        >
          <Plus />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Afslut hvile"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
