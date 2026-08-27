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
      toast.success("Post slettet");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <span className="sr-only">Slet post</span>
            &times;
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slet denne post?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette fjerner posten permanent. Denne handling kan ikke
            fortrydes.
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
        Ingen registreringer endnu.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dato</TableHead>
          <TableHead>Værdi</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              {new Date(entry.loggedAt).toLocaleString("da-DK")}
            </TableCell>
            <TableCell>
              {Number(entry.value).toLocaleString("da-DK")} {unit}
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
