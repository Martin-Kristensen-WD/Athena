"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DayOption = {
  id: string;
  name: string;
  exerciseCount: number;
};

export function DayPicker({
  programmeId,
  days,
  onBack,
}: {
  programmeId: string;
  days: DayOption[];
  onBack?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | undefined>(days[0]?.id);

  return (
    <div className="grid gap-4">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          onClick={onBack}
        >
          <ArrowLeft /> Skift program
        </Button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((day) => {
          const isSelected = day.id === selected;
          return (
            <Card
              key={day.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(day.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(day.id);
                }
              }}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                isSelected && "ring-2 ring-primary"
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{day.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  {day.exerciseCount}{" "}
                  {day.exerciseCount === 1 ? "øvelse" : "øvelser"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        disabled={!selected}
        onClick={() => {
          if (selected) {
            router.push(
              `/dashboard/workouts/sessions/new?programmeId=${programmeId}&dayId=${selected}`
            );
          }
        }}
      >
        <Play /> Start træningspas
      </Button>
    </div>
  );
}
