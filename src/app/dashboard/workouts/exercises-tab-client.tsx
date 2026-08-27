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
      toast.success(editing ? "Øvelse opdateret" : "Øvelse oprettet");
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
        toast.success("Øvelse slettet");
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
            <CardTitle>Mine øvelser</CardTitle>
            <CardDescription>Dine egne øvelser.</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus /> Tilføj øvelse
          </Button>
        </CardHeader>
        <CardContent>
          {myExercises.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Du har ikke tilføjet nogen øvelser endnu. Opret en, eller klon
              en fra kataloget nedenfor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Muskelgruppe</TableHead>
                  <TableHead>Udstyr</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
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
                          <span className="sr-only">Rediger</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(exercise)}
                        >
                          <Trash2 />
                          <span className="sr-only">Slet</span>
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
          <CardTitle>Katalog</CardTitle>
          <CardDescription>
            Systemøvelser. Klon en for at oprette din egen redigerbare kopi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Muskelgruppe</TableHead>
                <TableHead>Udstyr</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
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
                      <Copy /> Klon
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
            ? "Rediger øvelse"
            : cloneDefaults
              ? "Klon øvelse"
              : "Tilføj øvelse"
        }
        description={
          cloneDefaults && !editing
            ? "Gem din egen redigerbare kopi af denne katalogøvelse."
            : undefined
        }
        defaultValues={dialogDefaults}
        submitLabel={editing ? "Gem ændringer" : "Opret"}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet øvelse?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette &ldquo;{deleteTarget?.name}&rdquo; permanent.
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Sletter..." : "Slet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
