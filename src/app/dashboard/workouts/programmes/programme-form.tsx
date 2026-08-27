"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
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
import {
  programmeSchema,
  type ProgrammeInput,
} from "@/lib/validations/programmes";
import { createProgramme, updateProgramme } from "./actions";

export type ExerciseOption = {
  id: string;
  name: string;
  muscleGroup: string;
};

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
  const [pickerOpen, setPickerOpen] = useState(false);

  const form = useForm<
    z.input<typeof programmeSchema>,
    unknown,
    z.output<typeof programmeSchema>
  >({
    resolver: zodResolver(programmeSchema),
    defaultValues: initialValues ?? {
      name: "",
      description: "",
      exercises: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const groupedExercises = useMemo(() => {
    const usedIds = new Set(fields.map((field) => field.exerciseId));
    const available = exercises.filter((exercise) => !usedIds.has(exercise.id));
    const groups = new Map<string, ExerciseOption[]>();
    for (const exercise of available) {
      const group = groups.get(exercise.muscleGroup) ?? [];
      group.push(exercise);
      groups.set(exercise.muscleGroup, group);
    }
    return Array.from(groups.entries());
  }, [exercises, fields]);

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
    setPickerOpen(false);
  }

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

      toast.success(programmeId ? "Programme updated" : "Programme created");
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

  const exercisesError = form.formState.errors.exercises;
  const exercisesErrorMessage =
    typeof exercisesError?.message === "string" ? exercisesError.message : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Upper body strength" {...field} />
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What is this programme for?"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Exercises</h2>
            <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus /> Add exercise
            </Button>
          </div>
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add an exercise</DialogTitle>
              </DialogHeader>
              <Command className="rounded-lg border">
                <CommandInput placeholder="Search exercises..." />
                <CommandList>
                  <CommandEmpty>No exercises found.</CommandEmpty>
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
                          onSelect={() => addExercise(exercise)}
                        >
                          {exercise.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>

          {fields.length === 0 ? (
            <p className="text-muted-foreground mt-3 rounded-lg border border-dashed p-6 text-center text-sm">
              No exercises yet. Add one to get started.
            </p>
          ) : (
            <div className="mt-3 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead className="w-20">Sets</TableHead>
                    <TableHead className="w-28">Target reps</TableHead>
                    <TableHead className="w-28">Weight</TableHead>
                    <TableHead className="w-24">Rest (s)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
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
                            control={form.control}
                            name={`exercises.${index}.sets`}
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
                            control={form.control}
                            name={`exercises.${index}.targetReps`}
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
                            control={form.control}
                            name={`exercises.${index}.targetWeight`}
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
                            control={form.control}
                            name={`exercises.${index}.restSeconds`}
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
                            control={form.control}
                            name={`exercises.${index}.notes`}
                            render={({ field: notesField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Optional"
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
                              <span className="sr-only">Move up</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={index === fields.length - 1}
                              onClick={() => move(index, index + 1)}
                            >
                              <ArrowDown />
                              <span className="sr-only">Move down</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 />
                              <span className="sr-only">Remove</span>
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
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : programmeId
                ? "Save changes"
                : "Create programme"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
