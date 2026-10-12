"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startWorkoutSession } from "../../actions";

export function StartFreeSessionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = await startWorkoutSession({ kind: "free", name });
      if (!result || "error" in result) {
        toast.error(result?.error ?? "Kunne ikke starte træningspasset.");
        return;
      }
      if (result.resumed) {
        toast.info("Du havde allerede et træningspas i gang.");
      }
      router.push(`/dashboard/workouts/sessions/${result.sessionId}/live`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="free-session-name" className="text-sm font-medium">
          Navn (valgfrit)
        </label>
        <Input
          id="free-session-name"
          placeholder="Fx Push day"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          className="mt-1.5 h-10"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Starter..." : "Start tomt træningspas"}
      </Button>
    </form>
  );
}
