"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptProgrammeShare, declineProgrammeShare } from "./share-actions";

export function ShareResponseButtons({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(action: "accept" | "decline") {
    startTransition(async () => {
      const result =
        action === "accept"
          ? await acceptProgrammeShare(shareId)
          : await declineProgrammeShare(shareId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        action === "accept" ? "Program tilføjet" : "Deling afvist"
      );
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => respond("accept")}>
        <Check /> Accepter
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => respond("decline")}
      >
        <X /> Afvis
      </Button>
    </div>
  );
}
