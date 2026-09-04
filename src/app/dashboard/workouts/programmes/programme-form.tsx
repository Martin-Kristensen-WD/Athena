"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
  programmeSchema,
  type ProgrammeInput,
} from "@/lib/validations/programmes";
import { createProgramme, updateProgramme } from "./actions";

export type { ExerciseOption };

type ProgrammeFormValues = z.input<typeof programmeSchema>;

const MAX_DAYS = 7;

function formatMuscleGroup(value: string) {
  return value.replace(/_/g, " ");
}

export function ProgrammeForm({
  exercises,
  programmeId,
  initialValues,
}: {
  exercises: ExerciseOption[];
  programmeId?: string;
  initialValues?: ProgrammeInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState(exercises);

  function handleExerciseCreated(exercise: ExerciseOption) {
    setExerciseOptions((current) => [...current, exercise]);
  }

  const form = useForm<
    z.input<typeof programmeSchema>,
    unknown,
    z.output<typeof programmeSchema>
  >({
    resolver: zodResolver(programmeSchema),
    defaultValues: initialValues ?? {
      name: "",
      description: "",
      days: [{ name: "Dag 1", exercises: [] }],
    },
  });

  const {
    fields: dayFields,
    append: appendDay,
    remove: removeDay,
    move: moveDay,
  } = useFieldArray({ control: form.control, name: "days" });

  function onSubmit(values: ProgrammeInput) {
    setFormError(null);
    startTransition(async () => {
      const result = programmeId
        ? await updateProgramme(programmeId, values)
        : await createProgramme(values);

      if (result?.error) {
        setFormError(result.error);
        return;
      }

      toast.success(programmeId ? "Program opdateret" : "Program oprettet");
      const targetId =
        programmeId ?? ("programmeId" in result ? result.programmeId : undefined);
      if (targetId) {
        router.push(`/dashboard/workouts/programmes/${targetId}`);
      } else {
        router.push("/dashboard/workouts");
      }
      router.refresh();
    });
  }

  const daysError = form.formState.errors.days;
  const daysErrorMessage =
    typeof daysError?.message === "string" ? daysError.message : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Navn</FormLabel>
                <FormControl>
                  <Input placeholder="fx Styrke, overkrop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Beskrivelse (valgfrit)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Hvad skal dette program bruges til?"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Dage</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={dayFields.length >= MAX_DAYS}
              onClick={() =>
                appendDay({ name: `Dag ${dayFields.length + 1}`, exercises: [] })
              }
            >
              <Plus /> Tilføj dag
            </Button>
          </div>
          {daysErrorMessage && (
            <p className="text-destructive text-sm">{daysErrorMessage}</p>
          )}

          {dayFields.map((dayField, dayIndex) => (
            <ProgrammeDayCard
              key={dayField.id}
              control={form.control}
              exercises={exerciseOptions}
              onExerciseCreated={handleExerciseCreated}
              dayIndex={dayIndex}
              canRemove={dayFields.length > 1}
              canMoveUp={dayIndex > 0}
              canMoveDown={dayIndex < dayFields.length - 1}
              onRemove={() => removeDay(dayIndex)}
              onMoveUp={() => moveDay(dayIndex, dayIndex - 1)}
              onMoveDown={() => moveDay(dayIndex, dayIndex + 1)}
            />
          ))}
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
            {isPending
              ? "Gemmer..."
              : programmeId
                ? "Gem ændringer"
                : "Opret program"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ProgrammeDayCard({
  control,
  exercises,
  dayIndex,
  canRemove,
  canMoveUp,
  canMoveDown,
  onExerciseCreated,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  control: Control<ProgrammeFormValues>;
  exercises: ExerciseOption[];
  onExerciseCreated: (exercise: ExerciseOption) => void;
  dayIndex: number;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `days.${dayIndex}.exercises`,
  });

  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const usedIds = useMemo(
    () => new Set(fields.map((field) => field.exerciseId)),
    [fields]
  );

  function addExercise(exercise: ExerciseOption) {
    append({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: 3,
      targetReps: "8-12",
      targetWeight: undefined,
      restSeconds: undefined,
      notes: "",
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <FormField
          control={control}
          name={`days.${dayIndex}.name`}
          render={({ field }) => (
            <FormItem className="max-w-xs flex-1">
              <FormLabel>Dagens navn</FormLabel>
              <FormControl>
                <Input placeholder="fx Dag 1 - Overkrop" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-1 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUp />
            <span className="sr-only">Flyt dag op</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDown />
            <span className="sr-only">Flyt dag ned</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2 />
            <span className="sr-only">Fjern dag</span>
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Øvelser</h3>
          <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
            <Plus /> Tilføj øvelse
          </Button>
        </div>
        <ExercisePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          exercises={exercises}
          excludeIds={usedIds}
          onSelect={addExercise}
          onExerciseCreated={onExerciseCreated}
        />

        {fields.length === 0 ? (
          <p className="text-muted-foreground mt-3 rounded-lg border border-dashed p-6 text-center text-sm">
            Ingen øvelser endnu. Tilføj en for at komme i gang.
          </p>
        ) : (
          <div className="mt-3 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Øvelse</TableHead>
                  <TableHead className="w-20">Sæt</TableHead>
                  <TableHead className="w-28">Mål-reps</TableHead>
                  <TableHead className="w-28">Vægt</TableHead>
                  <TableHead className="w-24">Pause (sek.)</TableHead>
                  <TableHead>Noter</TableHead>
                  <TableHead className="w-28 text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const exercise = exercisesById.get(field.exerciseId);
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">
                          {field.exerciseName ?? exercise?.name}
                        </div>
                        <div className="text-muted-foreground text-xs capitalize">
                          {formatMuscleGroup(
                            field.muscleGroup ?? exercise?.muscleGroup ?? ""
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`days.${dayIndex}.exercises.${index}.sets`}
                          render={({ field: setsField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  className="w-16"
                                  {...setsField}
                                  value={
                                    (setsField.value as
                                      | string
                                      | number
                                      | undefined) ?? ""
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
                          name={`days.${dayIndex}.exercises.${index}.targetReps`}
                          render={({ field: repsField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="8-12"
                                  className="w-24"
                                  {...repsField}
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
                          name={`days.${dayIndex}.exercises.${index}.targetWeight`}
                          render={({ field: weightField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  className="w-24"
                                  {...weightField}
                                  value={
                                    (weightField.value as
                                      | string
                                      | number
                                      | undefined) ?? ""
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
                          name={`days.${dayIndex}.exercises.${index}.restSeconds`}
                          render={({ field: restField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="w-20"
                                  {...restField}
                                  value={
                                    (restField.value as
                                      | string
                                      | number
                                      | undefined) ?? ""
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
                          name={`days.${dayIndex}.exercises.${index}.notes`}
                          render={({ field: notesField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Valgfrit"
                                  className="w-32"
                                  {...notesField}
                                  value={notesField.value ?? ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          >
                            <ArrowUp />
                            <span className="sr-only">Flyt op</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === fields.length - 1}
                            onClick={() => move(index, index + 1)}
                          >
                            <ArrowDown />
                            <span className="sr-only">Flyt ned</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 />
                            <span className="sr-only">Fjern</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
