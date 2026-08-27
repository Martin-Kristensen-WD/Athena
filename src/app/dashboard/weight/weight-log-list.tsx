"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { deleteWeightDay } from "./actions";

export type WeightDayRow = {
  date: string;
  weight: number;
};

function DeleteDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWeightDay(date);
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
        render={
          <Button size="icon-sm" variant="ghost">
            <span className="sr-only">Slet dag</span>
            &times;
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slet denne dags registrering?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette fjerner vægtregistreringen for denne dag. Denne handling
            kan ikke fortrydes.
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

export function WeightLogList({
  rows,
  weightUnit,
}: {
  rows: WeightDayRow[];
  weightUnit: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen vægt registreret for denne måned endnu.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dato</TableHead>
          <TableHead>Vægt</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.date}>
            <TableCell>
              {new Date(`${row.date}T00:00:00`).toLocaleDateString("da-DK", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.weight.toLocaleString("da-DK")} {weightUnit}
            </TableCell>
            <TableCell>
              <DeleteDayButton date={row.date} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
