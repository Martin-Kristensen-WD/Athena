"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoCompareSlider({
  beforeId,
  afterId,
  beforeLabel,
  afterLabel,
  alt,
}: {
  beforeId: string;
  afterId: string;
  beforeLabel: string;
  afterLabel: string;
  alt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(50);

  function updateFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  function handlePointerDown(event: React.PointerEvent) {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!draggingRef.current) return;
    updateFromClientX(event.clientX);
  }

  function handlePointerUp(event: React.PointerEvent) {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") {
      setPosition((value) => Math.max(0, value - step));
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      setPosition((value) => Math.min(100, value + step));
      event.preventDefault();
    } else if (event.key === "Home") {
      setPosition(0);
      event.preventDefault();
    } else if (event.key === "End") {
      setPosition(100);
      event.preventDefault();
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative aspect-3/4 w-full cursor-ew-resize touch-none overflow-hidden rounded-lg border border-border select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/progress-photos/${afterId}`}
        alt={`${alt} (${afterLabel})`}
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/progress-photos/${beforeId}`}
        alt={`${alt} (${beforeLabel})`}
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-medium text-foreground ring-1 ring-border backdrop-blur">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-medium text-foreground ring-1 ring-border backdrop-blur">
        {afterLabel}
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background shadow-[0_0_0_1px_rgba(20,20,18,0.15)]"
        style={{ left: `${position}%` }}
        aria-hidden
      />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Sammenlign ${alt.toLowerCase()}: ${beforeLabel} mod ${afterLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={handleKeyDown}
        className="absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        style={{ left: `${position}%` }}
      >
        <ChevronLeft className="size-3.5 -mr-0.5" />
        <ChevronRight className="size-3.5 -ml-0.5" />
      </div>
    </div>
  );
}
