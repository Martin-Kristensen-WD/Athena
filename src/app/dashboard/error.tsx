"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid place-items-center gap-4 py-16 text-center">
      <div>
        <h2 className="text-lg font-semibold">Noget gik galt</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Siden kunne ikke indlæses. Prøv igen.
        </p>
      </div>
      <Button type="button" onClick={() => retry()}>
        Prøv igen
      </Button>
    </div>
  );
}
