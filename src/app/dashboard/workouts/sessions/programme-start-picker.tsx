"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DayPicker, type DayOption } from "./day-picker";

export type ProgrammeOption = {
  id: string;
  name: string;
  description: string | null;
  days: DayOption[];
};

export function ProgrammeStartPicker({
  programmes,
  activeProgrammeId,
}: {
  programmes: ProgrammeOption[];
  activeProgrammeId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = programmes.find((programme) => programme.id === selectedId);

  if (selected) {
    return (
      <div className="grid gap-4">
        <div>
          <h3 className="font-medium">{selected.name}</h3>
          <p className="text-muted-foreground text-xs">
            Vælg hvilken dag du skal træne.
          </p>
        </div>
        <DayPicker
          programmeId={selected.id}
          days={selected.days}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {programmes.map((programme) => {
        const isActive = programme.id === activeProgrammeId;
        const exerciseCount = programme.days.reduce(
          (sum, day) => sum + day.exerciseCount,
          0
        );
        return (
          <Card
            key={programme.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(programme.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedId(programme.id);
              }
            }}
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              isActive && "ring-2 ring-primary"
            )}
          >
            <CardHeader>
              <CardTitle>{programme.name}</CardTitle>
              {isActive && (
                <CardAction>
                  <Badge>Aktiv</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {programme.description && (
                <p className="text-muted-foreground text-sm">
                  {programme.description}
                </p>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                {programme.days.length}{" "}
                {programme.days.length === 1 ? "dag" : "dage"} ·{" "}
                {exerciseCount} {exerciseCount === 1 ? "øvelse" : "øvelser"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
