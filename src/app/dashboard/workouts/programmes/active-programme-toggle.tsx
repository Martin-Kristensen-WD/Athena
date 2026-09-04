"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  function onCheckedChange(checked: boolean) {
    startTransition(async () => {
      const result = await setActiveProgramme(checked ? programmeId : null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(checked ? "Program sat som aktivt" : "Aktivt program fjernet");
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Label htmlFor={`active-${programmeId}`} className="text-muted-foreground text-xs">
        Aktiv
      </Label>
      <Switch
        id={`active-${programmeId}`}
        size="sm"
        checked={active}
        disabled={isPending}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
