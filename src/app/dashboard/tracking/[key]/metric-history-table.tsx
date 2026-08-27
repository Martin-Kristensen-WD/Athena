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
import { deleteMetricEntry } from "./actions";

export type MetricEntryRow = {
  id: string;
  value: string;
  loggedAt: string;
  note: string | null;
};

function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMetricEntry(entryId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry deleted");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <span className="sr-only">Delete entry</span>
            &times;
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this entry. This action can&apos;t
            be undone.
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

export function MetricHistoryTable({
  entries,
  unit,
}: {
  entries: MetricEntryRow[];
  unit: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No entries logged yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              {new Date(entry.loggedAt).toLocaleString()}
            </TableCell>
            <TableCell>
              {Number(entry.value).toLocaleString()} {unit}
            </TableCell>
            <TableCell className="max-w-64 truncate whitespace-normal text-muted-foreground">
              {entry.note ?? ""}
            </TableCell>
            <TableCell>
              <DeleteEntryButton entryId={entry.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
