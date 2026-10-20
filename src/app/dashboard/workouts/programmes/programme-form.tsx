"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Link2, Link2Off, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
// Top-level sections sit on the page background as cards; exercises inside a
// day are borderless tiles one step lighter, with their inputs recessed back
// to the card colour so each tile reads as one unit.
const SECTION_SURFACE =
  "rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.04] sm:p-5 dark:shadow-none dark:ring-white/[0.04]";
const EXERCISE_TILE =
  "rounded-xl bg-muted p-3 [&_[data-slot=input]]:bg-card dark:[&_[data-slot=input]]:bg-card";
// Upper bound on per-set rep inputs rendered, so a mistyped set count (e.g.
// 300) doesn't flood the form with fields.
const MAX_PER_SET_INPUTS = 20;

function formatMuscleGroup(value: string) {
  return value.replace(/_/g, " ");
}

type VolumeExercise = { exerciseId?: string; muscleGroup?: string; sets?: unknown } | undefined;

/** Total sets per muscle group across one or more days' exercise lists. */
function sumMuscleGroupVolume(
  exerciseGroups: (VolumeExercise[] | undefined)[],
  exercisesById: Map<string, ExerciseOption>
): [string, number][] {
  const totals = new Map<string, number>();
  for (const group of exerciseGroups) {
    for (const exercise of group ?? []) {
      if (!exercise) continue;
      const muscleGroup =
        exercise.muscleGroup ?? exercisesById.get(exercise.exerciseId ?? "")?.muscleGroup;
      if (!muscleGroup) continue;
      const sets = Number(exercise.sets) || 0;
      if (sets <= 0) continue;
      totals.set(muscleGroup, (totals.get(muscleGroup) ?? 0) + sets);
    }
  }
  return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
}

type SupersetFlagExercise = { supersetWithNext?: boolean } | undefined;

/**
 * Letters (A, B, C, ...) for each contiguous run of 2+ exercises chained via
 * `supersetWithNext`, indexed the same as the input array. A solo exercise
 * gets `undefined`. Groups are derived fresh from the flags every time, so
 * reordering or removing exercises can never leave a group half-updated —
 * except a trailing `true` on the very last exercise, which is always
 * ignored here (there's no "next" exercise to pair it with).
 */
function computeSupersetGroupLabels(
  exerciseList: SupersetFlagExercise[] | undefined
): (string | undefined)[] {
  const list = exerciseList ?? [];
  const labels: (string | undefined)[] = new Array(list.length).fill(undefined);
  let groupStart = 0;
  let letterCode = 0;
  for (let i = 0; i < list.length; i++) {
    const linksToNext = Boolean(list[i]?.supersetWithNext) && i < list.length - 1;
    if (!linksToNext) {
      if (i > groupStart) {
        const letter = String.fromCharCode(65 + letterCode);
        for (let j = groupStart; j <= i; j++) labels[j] = letter;
        letterCode++;
      }
      groupStart = i + 1;
    }
  }
  return labels;
}

function MuscleGroupVolumeSummary({ totals }: { totals: [string, number][] }) {
  if (totals.length === 0) return null;
  return (
    <div>
      <h4 className="text-muted-foreground text-xs font-medium">
        Volumen pr. muskelgruppe / sæt
      </h4>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {totals.map(([muscleGroup, sets]) => (
          <Badge key={muscleGroup} variant="secondary" className="capitalize">
            {formatMuscleGroup(muscleGroup)}: {sets}
          </Badge>
        ))}
      </div>
    </div>
  );
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

  const exerciseOptionsById = useMemo(
    () => new Map(exerciseOptions.map((exercise) => [exercise.id, exercise])),
    [exerciseOptions]
  );

  // Watched so the weekly total updates live as days' exercises/sets change,
  // accumulating every day's exercises of the same muscle group together.
  const watchedDays = useWatch({ control: form.control, name: "days" });
  const weeklyMuscleGroupVolume = useMemo(
    () =>
      sumMuscleGroupVolume(
        (watchedDays ?? []).map((day) => day?.exercises),
        exerciseOptionsById
      ),
    [watchedDays, exerciseOptionsById]
  );

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
        <div className={cn(SECTION_SURFACE, "grid gap-4 sm:grid-cols-2")}>
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

        <div className={cn(SECTION_SURFACE, "grid gap-2")}>
          <h2 className="text-sm font-medium">Ugentlig volumen</h2>
          {weeklyMuscleGroupVolume.length > 0 ? (
            <MuscleGroupVolumeSummary totals={weeklyMuscleGroupVolume} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Tilføj øvelser til dagene for at se den ugentlige volumen.
            </p>
          )}
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

  const { fields, append, remove, move, update } = useFieldArray({
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

  // Watched (not just `fields`) so the breakdown updates live as the user
  // edits set counts, not only when exercises are added/removed.
  const watchedExercises = useWatch({
    control,
    name: `days.${dayIndex}.exercises`,
  });

  const muscleGroupVolume = useMemo(
    () => sumMuscleGroupVolume([watchedExercises], exercisesById),
    [watchedExercises, exercisesById]
  );

  const supersetGroupLabels = useMemo(
    () => computeSupersetGroupLabels(watchedExercises),
    [watchedExercises]
  );

  // A "linked to next" flag left on what is now the last exercise (e.g.
  // after removing what used to follow it, or reordering it to the end)
  // means nothing today, but would silently pull in whatever exercise gets
  // appended next. Clear it as soon as it goes dangling.
  const lastWatchedExercise = watchedExercises?.[watchedExercises.length - 1];
  const lastExerciseIsDanglingLinked = Boolean(lastWatchedExercise?.supersetWithNext);
  useEffect(() => {
    if (!lastExerciseIsDanglingLinked || !watchedExercises) return;
    const lastIndex = watchedExercises.length - 1;
    update(lastIndex, { ...watchedExercises[lastIndex], supersetWithNext: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExerciseIsDanglingLinked]);

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
      supersetWithNext: false,
    });
  }

  function toggleSupersetWithNext(index: number) {
    const current = watchedExercises?.[index];
    if (!current) return;
    update(index, { ...current, supersetWithNext: !current.supersetWithNext });
  }

  function removeExercise(index: number) {
    // Removing the last exercise can leave its new-last neighbor with a
    // dangling link flag; the effect above also catches this, but clearing
    // it here avoids a one-frame flash of a stale connector state.
    if (index === fields.length - 1 && index > 0) {
      const previous = watchedExercises?.[index - 1];
      if (previous?.supersetWithNext) {
        update(index - 1, { ...previous, supersetWithNext: false });
      }
    }
    remove(index);
  }

  return (
    <div className={SECTION_SURFACE}>
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
          <p className="text-muted-foreground mt-3 rounded-xl border border-dashed p-6 text-center text-sm">
            Ingen øvelser endnu. Tilføj en for at komme i gang.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {fields.map((field, index) => {
              const exercise = exercisesById.get(field.exerciseId);
              const supersetLabel = supersetGroupLabels[index];
              const linkedToNext = Boolean(
                watchedExercises?.[index]?.supersetWithNext
              );
              const linkedToPrevious =
                index > 0 &&
                Boolean(watchedExercises?.[index - 1]?.supersetWithNext);
              return (
                <div
                  key={field.id}
                  className={cn(
                    EXERCISE_TILE,
                    supersetLabel &&
                      "bg-primary/10 ring-1 ring-primary/25 dark:bg-primary/10"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      {supersetLabel && (
                        <Badge variant="outline" className="shrink-0">
                          Superset {supersetLabel}
                        </Badge>
                      )}
                      <div>
                        <div className="font-medium">
                          {field.exerciseName ?? exercise?.name}
                        </div>
                        <div className="text-muted-foreground text-xs capitalize">
                          {formatMuscleGroup(
                            field.muscleGroup ?? exercise?.muscleGroup ?? ""
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant={
                                linkedToPrevious || linkedToNext
                                  ? "secondary"
                                  : "ghost"
                              }
                              size="icon-sm"
                            />
                          }
                        >
                          {linkedToPrevious || linkedToNext ? (
                            <Link2 />
                          ) : (
                            <Link2Off />
                          )}
                          <span className="sr-only">Superset</span>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-2">
                          <p className="text-muted-foreground px-1 pb-1 text-xs font-medium">
                            Superset
                          </p>
                          <label className="hover:bg-muted flex items-center gap-2 rounded-md p-1.5 text-sm has-disabled:opacity-50">
                            <Checkbox
                              checked={linkedToPrevious}
                              disabled={index === 0}
                              onCheckedChange={() =>
                                toggleSupersetWithNext(index - 1)
                              }
                            />
                            Sammen med forrige øvelse
                          </label>
                          <label className="hover:bg-muted flex items-center gap-2 rounded-md p-1.5 text-sm has-disabled:opacity-50">
                            <Checkbox
                              checked={linkedToNext}
                              disabled={index === fields.length - 1}
                              onCheckedChange={() =>
                                toggleSupersetWithNext(index)
                              }
                            />
                            Sammen med næste øvelse
                          </label>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 />
                        <span className="sr-only">Fjern</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField
                      control={control}
                      name={`days.${dayIndex}.exercises.${index}.sets`}
                      render={({ field: setsField }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs font-normal">
                            Sæt
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
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
                    <TargetRepsField
                      control={control}
                      dayIndex={dayIndex}
                      exerciseIndex={index}
                    />
                    <FormField
                      control={control}
                      name={`days.${dayIndex}.exercises.${index}.targetWeight`}
                      render={({ field: weightField }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs font-normal">
                            Vægt
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
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
                    <FormField
                      control={control}
                      name={`days.${dayIndex}.exercises.${index}.restSeconds`}
                      render={({ field: restField }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-xs font-normal">
                            Pause (sek.)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                  </div>

                  <PerSetTargetReps
                    control={control}
                    dayIndex={dayIndex}
                    exerciseIndex={index}
                  />

                  <FormField
                    control={control}
                    name={`days.${dayIndex}.exercises.${index}.notes`}
                    render={({ field: notesField }) => (
                      <FormItem className="mt-3">
                        <FormLabel className="text-muted-foreground text-xs font-normal">
                          Noter
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Valgfrit"
                            {...notesField}
                            value={notesField.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              );
            })}
          </div>
        )}

        {muscleGroupVolume.length > 0 && (
          <div className="mt-3">
            <MuscleGroupVolumeSummary totals={muscleGroupVolume} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The single "Mål-reps" input; shows a read-only summary when per-set targets are on. */
function TargetRepsField({
  control,
  dayIndex,
  exerciseIndex,
}: {
  control: Control<ProgrammeFormValues>;
  dayIndex: number;
  exerciseIndex: number;
}) {
  const setTargetReps = useWatch({
    control,
    name: `days.${dayIndex}.exercises.${exerciseIndex}.setTargetReps`,
  });

  if (setTargetReps) {
    return (
      <div className="grid gap-2">
        <span className="text-muted-foreground text-xs">Mål-reps</span>
        <Input
          disabled
          value={setTargetReps.map((reps) => reps || "–").join("/")}
        />
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name={`days.${dayIndex}.exercises.${exerciseIndex}.targetReps`}
      render={({ field: repsField }) => (
        <FormItem>
          <FormLabel className="text-muted-foreground text-xs font-normal">
            Mål-reps
          </FormLabel>
          <FormControl>
            <Input placeholder="8-12" {...repsField} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Toggle plus one rep input per set. While on, the per-set list is kept the
 * same length as the set count: added sets copy the last set's target,
 * removed sets drop off the end.
 */
function PerSetTargetReps({
  control,
  dayIndex,
  exerciseIndex,
}: {
  control: Control<ProgrammeFormValues>;
  dayIndex: number;
  exerciseIndex: number;
}) {
  const { setValue, getValues } = useFormContext<ProgrammeFormValues>();
  const basePath = `days.${dayIndex}.exercises.${exerciseIndex}` as const;
  const setTargetReps = useWatch({ control, name: `${basePath}.setTargetReps` });
  const rawSets = useWatch({ control, name: `${basePath}.sets` });
  const setCount = Number(rawSets);
  const validSetCount =
    Number.isInteger(setCount) && setCount >= 1 && setCount <= MAX_PER_SET_INPUTS
      ? setCount
      : null;

  const enabled = Boolean(setTargetReps);
  const currentLength = setTargetReps?.length ?? 0;

  useEffect(() => {
    if (!enabled || validSetCount === null || currentLength === validSetCount) {
      return;
    }
    const current = getValues(`${basePath}.setTargetReps`) ?? [];
    const fill = current[current.length - 1] ?? getValues(`${basePath}.targetReps`) ?? "";
    const resized = Array.from(
      { length: validSetCount },
      (_, i) => current[i] ?? fill
    );
    setValue(`${basePath}.setTargetReps`, resized, { shouldDirty: true });
  }, [enabled, validSetCount, currentLength, basePath, getValues, setValue]);

  function toggle(checked: boolean) {
    if (checked) {
      const base = getValues(`${basePath}.targetReps`) ?? "";
      setValue(
        `${basePath}.setTargetReps`,
        Array.from({ length: validSetCount ?? 1 }, () => base),
        { shouldDirty: true }
      );
    } else {
      const first = getValues(`${basePath}.setTargetReps`)?.[0];
      if (first) {
        setValue(`${basePath}.targetReps`, first, { shouldDirty: true });
      }
      setValue(`${basePath}.setTargetReps`, undefined, { shouldDirty: true });
    }
  }

  return (
    <div className="mt-3 grid gap-2">
      <label className="flex w-fit items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => toggle(Boolean(checked))}
        />
        Forskellige reps pr. sæt
      </label>
      {enabled && setTargetReps && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {setTargetReps.map((_, setIndex) => (
            <FormField
              key={setIndex}
              control={control}
              name={`${basePath}.setTargetReps.${setIndex}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs font-normal">
                    Sæt {setIndex + 1}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="8-12" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
