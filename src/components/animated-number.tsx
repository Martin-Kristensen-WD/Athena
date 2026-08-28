"use client";

import { useEffect, useRef, useState } from "react";

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

export function AnimatedNumber({
  value,
  duration = 1400,
  formatOptions = { maximumFractionDigits: 0 },
}: {
  value: number;
  duration?: number;
  formatOptions?: Intl.NumberFormatOptions;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(value * easeOutQuint(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <>{display.toLocaleString("da-DK", formatOptions)}</>;
}
