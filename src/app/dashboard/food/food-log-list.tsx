"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteFoodDay } from "./actions";

export type FoodDayRow = {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const PREVIEW_COUNT = 15;

function DeleteDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFoodDay(date);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dag fjernet");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button size="icon-sm" variant="ghost" aria-label="Slet dag" />}
      >
        <span aria-hidden>&times;</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slet denne dags registrering?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette fjerner alle madregistreringer for denne dag. Denne
            handling kan ikke fortrydes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annullér</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Sletter..." : "Slet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FoodLogList({ rows }: { rows: FoodDayRow[] }) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen mad registreret for denne måned endnu.
      </p>
    );
  }

  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_COUNT);

  return (
    <div className="grid gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dato</TableHead>
            <TableHead>Kcal</TableHead>
            <TableHead>Protein</TableHead>
            <TableHead>Kulhydrater</TableHead>
            <TableHead>Fedt</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, index) => (
          <TableRow
            key={row.date}
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
            style={{
              animationDelay: `${Math.min(index * 25, 400)}ms`,
              animationFillMode: "backwards",
            }}
          >
            <TableCell>
              {new Date(`${row.date}T00:00:00`).toLocaleDateString("da-DK", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.kcal.toLocaleString("da-DK")}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.protein > 0 ? `${row.protein.toLocaleString("da-DK")}g` : "—"}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.carbs > 0 ? `${row.carbs.toLocaleString("da-DK")}g` : "—"}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.fat > 0 ? `${row.fat.toLocaleString("da-DK")}g` : "—"}
            </TableCell>
            <TableCell>
              <DeleteDayButton date={row.date} />
            </TableCell>
          </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > PREVIEW_COUNT && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? (
              <>
                <ChevronUp /> Vis færre
              </>
            ) : (
              <>
                <ChevronDown /> Vis alle {rows.length} for måneden
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
