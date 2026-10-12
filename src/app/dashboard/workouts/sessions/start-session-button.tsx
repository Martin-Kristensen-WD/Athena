"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { StartSessionInput } from "@/lib/validations/sessions";
import { startWorkoutSession } from "./actions";

export function StartSessionButton({
  input,
  children,
  className,
  disabled,
}: {
  input: StartSessionInput;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      className={className}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await startWorkoutSession(input);
          if (!result || "error" in result) {
            toast.error(result?.error ?? "Kunne ikke starte træningspasset.");
            return;
          }
          if (result.resumed) {
            toast.info("Du havde allerede et træningspas i gang.");
          }
          router.push(
            `/dashboard/workouts/sessions/${result.sessionId}/live`
          );
          router.refresh();
        })
      }
    >
      {pending ? "Starter..." : (children ?? "Start træning")}
    </Button>
  );
}
