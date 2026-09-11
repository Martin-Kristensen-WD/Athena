"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { setActiveProgramme } from "./actions";

export function ActiveProgrammeToggle({
  programmeId,
  active,
}: {
  programmeId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setActiveProgramme(active ? null : programmeId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Aktivt program fjernet" : "Program sat som aktivt");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }}
      className={cn(
        active &&
          "border-primary bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
      )}
    >
      {isPending ? "Opdaterer..." : active ? "Aktivt program" : "Sæt som aktiv program"}
    </Button>
  );
}
