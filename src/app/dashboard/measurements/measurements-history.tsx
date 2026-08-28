"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeasurementType, ProgressPhotoView } from "@/db/schema";
import { MEASUREMENT_LABELS, MEASUREMENT_UNIT, PHOTO_VIEW_LABELS } from "./constants";
import { deleteMeasurementDay } from "./actions";

export type MeasurementSession = {
  date: string;
  values: Partial<Record<MeasurementType, number>>;
  photos: { id: string; view: ProgressPhotoView }[];
};

function DeleteDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMeasurementDay(date);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Registrering fjernet");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <span className="sr-only">Slet registrering</span>
            &times;
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slet denne dags registrering?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette fjerner alle målinger og billeder for denne dag. Denne
            handling kan ikke fortrydes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annullér</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Sletter..." : "Slet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MeasurementsHistory({ sessions }: { sessions: MeasurementSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen målinger eller billeder registreret endnu.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session) => {
        const valueEntries = Object.entries(session.values) as [
          MeasurementType,
          number,
        ][];
        return (
          <Card key={session.date}>
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {new Date(`${session.date}T00:00:00`).toLocaleDateString("da-DK", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <DeleteDayButton date={session.date} />
            </CardHeader>
            <CardContent className="grid gap-4">
              {valueEntries.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {valueEntries.map(([type, value]) => (
                    <div key={type}>
                      <span className="text-muted-foreground">
                        {MEASUREMENT_LABELS[type]}
                      </span>{" "}
                      <span className="font-medium tabular-nums">
                        {value.toLocaleString("da-DK")} {MEASUREMENT_UNIT}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {session.photos.length > 0 && (
                <div className="flex gap-3">
                  {session.photos.map((photo) => (
                    <figure key={photo.id} className="grid gap-1">
                      <div className="h-32 w-24 overflow-hidden rounded-lg border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/progress-photos/${photo.id}`}
                          alt={PHOTO_VIEW_LABELS[photo.view]}
                          className="size-full object-cover"
                        />
                      </div>
                      <figcaption className="text-center text-xs text-muted-foreground">
                        {PHOTO_VIEW_LABELS[photo.view]}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
