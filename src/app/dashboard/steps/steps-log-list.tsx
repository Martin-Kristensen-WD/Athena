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
import { deleteStepsDay } from "./actions";

export type StepsDayRow = {
  date: string;
  steps: number;
};

function DeleteDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStepsDay(date);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Day removed");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <span className="sr-only">Delete day</span>
            &times;
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this day&apos;s steps?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes all step entries logged for this day. This action
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StepsLogList({ rows }: { rows: StepsDayRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No steps logged for this month yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Steps</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.date}>
            <TableCell>
              {new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </TableCell>
            <TableCell className="font-mono tabular-nums">
              {row.steps.toLocaleString()}
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
