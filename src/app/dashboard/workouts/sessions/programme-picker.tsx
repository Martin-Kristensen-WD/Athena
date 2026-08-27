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

export function ProgrammePicker({
  programmes,
}: {
  programmes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | undefined>(
    programmes[0]?.id
  );

  return (
    <div className="grid gap-4">
      <Select
        value={selected}
        onValueChange={(value) => setSelected(value ?? undefined)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a programme" />
        </SelectTrigger>
        <SelectContent>
          {programmes.map((programme) => (
            <SelectItem key={programme.id} value={programme.id}>
              {programme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        disabled={!selected}
        onClick={() => {
          if (selected) {
            router.push(`/dashboard/workouts/sessions/new?programmeId=${selected}`);
          }
        }}
      >
        Continue
      </Button>
    </div>
  );
}
