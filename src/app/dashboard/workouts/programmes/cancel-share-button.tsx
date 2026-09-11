"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelProgrammeShare } from "./share-actions";

export function CancelShareButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onCancel() {
    startTransition(async () => {
      const result = await cancelProgrammeShare(shareId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Deling fortrudt");
      router.refresh();
    });
  }

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={isPending}
      onClick={onCancel}
    >
      <X />
      <span className="sr-only">Fortryd deling</span>
    </Button>
  );
}
