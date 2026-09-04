"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DayPicker({
  programmeId,
  days,
}: {
  programmeId: string;
  days: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | undefined>(days[0]?.id);

  return (
    <div className="grid gap-4">
      <Select
        value={selected}
        onValueChange={(value) => setSelected(value ?? undefined)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Vælg en dag" />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day.id} value={day.id}>
              {day.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        Fortsæt
      </Button>
    </div>
  );
}
