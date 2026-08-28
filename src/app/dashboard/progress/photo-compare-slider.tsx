"use client";

import { useState } from "react";

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
  const [position, setPosition] = useState(50);

  return (
    <div className="grid gap-2">
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-border select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/progress-photos/${afterId}`}
          alt={`${alt} (${afterLabel})`}
          className="absolute inset-0 size-full object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/progress-photos/${beforeId}`}
          alt={`${alt} (${beforeLabel})`}
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-background"
          style={{ left: `${position}%` }}
          aria-hidden
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label={`Sammenlign ${alt.toLowerCase()}`}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
    </div>
  );
}
