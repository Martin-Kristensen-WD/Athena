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
import { deleteSleepDay } from "./actions";

export type SleepDayRow = {
  date: string;
  hours: number;
};

function DeleteDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSleepDay(date);
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
            Dette fjerner alle søvnregistreringer for denne dag. Denne
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

export function SleepLogList({ rows }: { rows: SleepDayRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen søvn registreret for denne måned endnu.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dato</TableHead>
          <TableHead>Timer</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
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
              {row.hours.toLocaleString("da-DK")} t
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
