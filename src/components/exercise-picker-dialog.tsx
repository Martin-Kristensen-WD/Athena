"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ExerciseFormDialog } from "@/components/exercise-form-dialog";
import type { ExerciseFormInput } from "@/lib/validations/exercises";
import { createExercise } from "@/app/dashboard/workouts/exercises-actions";

export type ExerciseOption = {
  id: string;
  name: string;
  muscleGroup: string;
};

function formatMuscleGroup(value: string) {
  return value.replace(/_/g, " ");
}

export function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  excludeIds,
  onSelect,
  onExerciseCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseOption[];
  excludeIds: Set<string>;
  onSelect: (exercise: ExerciseOption) => void;
  onExerciseCreated: (exercise: ExerciseOption) => void;
}) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const groupedExercises = useMemo(() => {
    const available = exercises.filter((exercise) => !excludeIds.has(exercise.id));
    const groups = new Map<string, ExerciseOption[]>();
    for (const exercise of available) {
      const group = groups.get(exercise.muscleGroup) ?? [];
      group.push(exercise);
      groups.set(exercise.muscleGroup, group);
    }
    return Array.from(groups.entries());
  }, [exercises, excludeIds]);

  function handleSelect(exercise: ExerciseOption) {
    onSelect(exercise);
    onOpenChange(false);
    setSearch("");
  }

  async function handleCreateExercise(values: ExerciseFormInput) {
    const result = await createExercise(values);
    if (result?.error || !result?.exerciseId) {
      return { error: result?.error ?? "Kunne ikke oprette øvelsen." };
    }
    const newExercise: ExerciseOption = {
      id: result.exerciseId,
      name: values.name.trim(),
      muscleGroup: values.muscleGroup,
    };
    toast.success("Øvelse oprettet");
    onExerciseCreated(newExercise);
    handleSelect(newExercise);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setSearch("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tilføj en øvelse</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput
              placeholder="Søg efter øvelser..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Ingen øvelser fundet.</CommandEmpty>
              {groupedExercises.map(([muscleGroup, items]) => (
                <CommandGroup
                  key={muscleGroup}
                  heading={formatMuscleGroup(muscleGroup)}
                >
                  {items.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name}
                      keywords={[muscleGroup]}
                      onSelect={() => handleSelect(exercise)}
                    >
                      {exercise.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              <CommandGroup heading="Ny øvelse">
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => setCreateOpen(true)}
                >
                  <Plus /> Opret ny øvelse
                  {search ? ` "${search}"` : ""}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <ExerciseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Opret ny øvelse"
        description="Tilføjes til dine egne øvelser og listen her."
        defaultValues={{ name: search }}
        submitLabel="Opret og tilføj"
        onSubmit={handleCreateExercise}
      />
    </>
  );
}
