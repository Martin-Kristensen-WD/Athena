"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  createSystemExercise,
  deleteSystemExercise,
  updateSystemExercise,
} from "./actions";

type ExerciseRow = typeof exercises.$inferSelect;

const MUSCLE_GROUP_LABELS: Record<string, string> = Object.fromEntries(
  MUSCLE_GROUP_OPTIONS.map((option) => [option.value, option.label])
);

export function AdminExercisesClient({
  exercises: catalogExercises,
}: {
  exercises: ExerciseRow[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExerciseRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(exercise: ExerciseRow) {
    setEditing(exercise);
    setFormOpen(true);
  }

  async function handleSubmit(values: ExerciseFormInput) {
    const result = editing
      ? await updateSystemExercise(editing.id, values)
      : await createSystemExercise(values);
    if (!result?.error) {
      toast.success(editing ? "Øvelse opdateret" : "Øvelse oprettet");
    }
    return result;
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    startDeleteTransition(async () => {
      const result = await deleteSystemExercise(id);
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
    : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Øvelseskatalog</CardTitle>
          <CardDescription>
            Fælles øvelser, som vises til alle brugere.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus /> Tilføj øvelse
        </Button>
      </CardHeader>
      <CardContent>
        {catalogExercises.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ingen øvelser i kataloget endnu.
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

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Rediger katalogøvelse" : "Tilføj katalogøvelse"}
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
            <AlertDialogTitle>Slet katalogøvelse?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette sletter permanent &ldquo;{deleteTarget?.name}&rdquo; fra
              kataloget for alle brugere. Handlingen kan ikke fortrydes.
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
    </Card>
  );
}
