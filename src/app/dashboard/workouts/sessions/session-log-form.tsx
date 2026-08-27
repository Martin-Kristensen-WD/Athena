"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
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
  workoutSessionSchema,
  type WorkoutSessionInput,
} from "@/lib/validations/sessions";
import { createWorkoutSession } from "./actions";

export type PlannedExercise = {
  id: string;
  exerciseName: string;
  sets: number;
  targetReps: string;
  targetWeight: string | null;
};

export function SessionLogForm({
  programmeId,
  exercises,
}: {
  programmeId: string;
  exercises: PlannedExercise[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof workoutSessionSchema>,
    unknown,
    z.output<typeof workoutSessionSchema>
  >({
    resolver: zodResolver(workoutSessionSchema),
    defaultValues: {
      programmeId,
      durationMinutes: undefined,
      notes: "",
      exercises: exercises.map((exercise) => ({
        programmeExerciseId: exercise.id,
        exerciseName: exercise.exerciseName,
        sets: Array.from({ length: exercise.sets }, () => ({
          reps: undefined,
          weight: undefined,
        })),
      })),
    },
  });

  function onSubmit(values: WorkoutSessionInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createWorkoutSession(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Træningspas registreret");
      router.push(`/dashboard/workouts/sessions/${result.sessionId}`);
      router.refresh();
    });
  }

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

        <div className="grid gap-6">
          {exercises.map((exercise, exerciseIndex) => (
            <div key={exercise.id} className="rounded-lg border p-4">
              <h3 className="font-medium">{exercise.exerciseName}</h3>
              <p className="text-muted-foreground text-xs">
                Mål: {exercise.targetReps} reps
                {exercise.targetWeight ? ` @ ${exercise.targetWeight}` : ""}
              </p>
              <div className="mt-3 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sæt</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Vægt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: exercise.sets }).map((_, setIndex) => (
                      <TableRow key={setIndex}>
                        <TableCell className="text-muted-foreground">
                          {setIndex + 1}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`exercises.${exerciseIndex}.sets.${setIndex}.reps`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder={exercise.targetReps}
                                    className="w-20"
                                    {...field}
                                    value={
                                      (field.value as
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
                            name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    placeholder={exercise.targetWeight ?? undefined}
                                    className="w-24"
                                    {...field}
                                    value={
                                      (field.value as
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
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
            {isPending ? "Gemmer..." : "Gem træningspas"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
