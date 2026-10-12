"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Tracks a short-lived "just succeeded" flag so a form can play a subtle
 * confirmation animation after a successful submit.
 */
export function useSubmitSuccess(duration = 1600) {
  const [success, setSuccess] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSuccess = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSuccess(true);
    timer.current = setTimeout(() => setSuccess(false), duration);
  }, [duration]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { success, flashSuccess };
}

export function SubmitButton({
  pending = false,
  success = false,
  pendingLabel,
  successLabel = "Gemt",
  children,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type"> & {
  pending?: boolean;
  success?: boolean;
  pendingLabel?: string;
  successLabel?: string;
}) {
  return (
    <Button
      type="submit"
      {...props}
      disabled={pending || disabled}
      data-success={success ? "" : undefined}
      className={cn(
        "relative isolate overflow-hidden data-[success]:animate-success-pop data-[success]:bg-success data-[success]:text-success-foreground data-[success]:hover:bg-success",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 transition-[transform,opacity] duration-200",
          success && "-translate-y-6 opacity-0"
        )}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </span>
      <span
        aria-hidden={!success}
        className={cn(
          "absolute inset-0 flex items-center justify-center gap-1.5 transition-[transform,opacity] duration-200",
          success ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M20 6 9 17l-5-5"
            style={{ strokeDasharray: 24 }}
            className={success ? "animate-check-draw" : undefined}
          />
        </svg>
        {successLabel}
      </span>
    </Button>
  );
}
