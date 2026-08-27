"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExerciseFormDialog } from "@/components/exercise-form-dialog";
import {
  MUSCLE_GROUP_OPTIONS,
  type ExerciseFormInput,
} from "@/lib/validations/exercises";
import type { exercises } from "@/db/schema";
import { createExercise, deleteExercise, updateExercise } from "./exercises-actions";

type ExerciseRow = typeof exercises.$inferSelect;

const MUSCLE_GROUP_LABELS: Record<string, string> = Object.fromEntries(
  MUSCLE_GROUP_OPTIONS.map((option) => [option.value, option.label])
);

export function ExercisesTabClient({
  myExercises,
  catalogExercises,
}: {
  myExercises: ExerciseRow[];
  catalogExercises: ExerciseRow[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [cloneDefaults, setCloneDefaults] =
    useState<Partial<ExerciseFormInput> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExerciseRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setCloneDefaults(null);
    setFormOpen(true);
  }

  function openEdit(exercise: ExerciseRow) {
    setEditing(exercise);
    setCloneDefaults(null);
    setFormOpen(true);
  }

  function openClone(exercise: ExerciseRow) {
    setEditing(null);
    setCloneDefaults({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment ?? "",
      notes: exercise.notes ?? "",
    });
    setFormOpen(true);
  }

  async function handleSubmit(values: ExerciseFormInput) {
    const result = editing
      ? await updateExercise(editing.id, values)
      : await createExercise(values);
    if (!result?.error) {
      toast.success(editing ? "Exercise updated" : "Exercise created");
    }
    return result;
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startDeleteTransition(async () => {
      const result = await deleteExercise(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Exercise deleted");
      }
      setDeleteTarget(null);
    });
  }

  const dialogDefaults: Partial<ExerciseFormInput> | undefined = editing
    ? {
        name: editing.name,
        muscleGroup: editing.muscleGroup,
        equipment: editing.equipment ?? "",
        notes: editing.notes ?? "",
      }
    : (cloneDefaults ?? undefined);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Exercises</CardTitle>
            <CardDescription>Your custom exercises.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus /> Add exercise
          </Button>
        </CardHeader>
        <CardContent>
          {myExercises.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You haven&apos;t added any exercises yet. Create one or clone
              one from the catalog below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Muscle group</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">
                      {exercise.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MUSCLE_GROUP_LABELS[exercise.muscleGroup] ??
                          exercise.muscleGroup}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exercise.equipment ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(exercise)}
                        >
                          <Pencil />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(exercise)}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>
            System exercises. Clone one to create your own editable copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Muscle group</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogExercises.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium">
                    {exercise.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {MUSCLE_GROUP_LABELS[exercise.muscleGroup] ??
                        exercise.muscleGroup}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {exercise.equipment ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openClone(exercise)}
                    >
                      <Copy /> Clone
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={
          editing
            ? "Edit exercise"
            : cloneDefaults
              ? "Clone exercise"
              : "Add exercise"
        }
        description={
          cloneDefaults && !editing
            ? "Save your own editable copy of this catalog exercise."
            : undefined
        }
        defaultValues={dialogDefaults}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
