"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExercisePickerDialog,
  type ExerciseOption,
} from "@/components/exercise-picker-dialog";
import {
  freeWorkoutSessionSchema,
  type FreeWorkoutSessionInput,
} from "@/lib/validations/sessions";
import { createFreeWorkoutSession } from "./actions";

type FreeSessionFormValues = z.input<typeof freeWorkoutSessionSchema>;

function formatMuscleGroup(value: string) {
  return value.replace(/_/g, " ");
}

export function FreeSessionLogForm({
  exercises,
}: {
  exercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState(exercises);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleExerciseCreated(exercise: ExerciseOption) {
    setExerciseOptions((current) => [...current, exercise]);
  }

  const form = useForm<
    z.input<typeof freeWorkoutSessionSchema>,
    unknown,
    z.output<typeof freeWorkoutSessionSchema>
  >({
    resolver: zodResolver(freeWorkoutSessionSchema),
    defaultValues: {
      durationMinutes: undefined,
      notes: "",
      exercises: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const usedIds = useMemo(
    () => new Set(fields.map((field) => field.exerciseId)),
    [fields]
  );

  function addExercise(exercise: ExerciseOption) {
    append({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: [{ reps: undefined, weight: undefined }],
    });
  }

  function onSubmit(values: FreeWorkoutSessionInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createFreeWorkoutSession(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Træningspas registreret");
      router.push(`/dashboard/workouts/sessions/${result.sessionId}`);
      router.refresh();
    });
  }

  const exercisesError = form.formState.errors.exercises;
  const exercisesErrorMessage =
    typeof exercisesError?.message === "string" ? exercisesError.message : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Varighed i minutter (valgfrit)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={(field.value as string | number | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Noter (valgfrit)</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Øvelser</h2>
            <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus /> Tilføj øvelse
            </Button>
          </div>

          <ExercisePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            exercises={exerciseOptions}
            excludeIds={usedIds}
            onSelect={addExercise}
            onExerciseCreated={handleExerciseCreated}
          />

          {fields.length === 0 ? (
            <p className="text-muted-foreground mt-3 rounded-lg border border-dashed p-6 text-center text-sm">
              Ingen øvelser endnu. Tilføj en for at komme i gang.
            </p>
          ) : (
            <div className="mt-3 grid gap-4">
              {fields.map((field, exerciseIndex) => (
                <FreeExerciseCard
                  key={field.id}
                  control={form.control}
                  exerciseIndex={exerciseIndex}
                  exerciseName={field.exerciseName}
                  muscleGroup={field.muscleGroup}
                  onRemove={() => remove(exerciseIndex)}
                />
              ))}
            </div>
          )}
          {exercisesErrorMessage && (
            <p className="text-destructive mt-2 text-sm">
              {exercisesErrorMessage}
            </p>
          )}
        </div>

        {formError && <p className="text-destructive text-sm">{formError}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/workouts")}
          >
            Annullér
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Gemmer..." : "Gem træningspas"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function FreeExerciseCard({
  control,
  exerciseIndex,
  exerciseName,
  muscleGroup,
  onRemove,
}: {
  control: Control<FreeSessionFormValues>;
  exerciseIndex: number;
  exerciseName?: string;
  muscleGroup?: string;
  onRemove: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseIndex}.sets`,
  });

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{exerciseName}</h3>
          {muscleGroup && (
            <p className="text-muted-foreground text-xs capitalize">
              {formatMuscleGroup(muscleGroup)}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 />
          <span className="sr-only">Fjern øvelse</span>
        </Button>
      </div>

      <div className="mt-3 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Sæt</TableHead>
              <TableHead>Reps</TableHead>
              <TableHead>Vægt</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">Handlinger</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((setField, setIndex) => (
              <TableRow key={setField.id}>
                <TableCell className="text-muted-foreground">
                  {setIndex + 1}
                </TableCell>
                <TableCell>
                  <FormField
                    control={control}
                    name={`exercises.${exerciseIndex}.sets.${setIndex}.reps`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            className="w-20"
                            {...field}
                            value={
                              (field.value as string | number | undefined) ?? ""
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={control}
                    name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            className="w-24"
                            {...field}
                            value={
                              (field.value as string | number | undefined) ?? ""
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={fields.length === 1}
                    onClick={() => remove(setIndex)}
                  >
                    <Trash2 />
                    <span className="sr-only">Fjern sæt</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => append({ reps: undefined, weight: undefined })}
      >
        <Plus /> Tilføj sæt
      </Button>
    </div>
  );
}
