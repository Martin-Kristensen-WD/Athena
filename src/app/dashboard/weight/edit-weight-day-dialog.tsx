"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  logWeightEntrySchema,
  type LogWeightEntryInput,
} from "@/lib/validations/weight";
import { setWeightDay, deleteWeightDay } from "./actions";

function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EditWeightDayDialog({
  date,
  onOpenChange,
  initialWeight,
  weightUnit,
}: {
  /** The clicked day (YYYY-MM-DD), or null while the dialog is closed. */
  date: string | null;
  onOpenChange: (open: boolean) => void;
  initialWeight: number | null;
  weightUnit: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const open = date !== null;

  const form = useForm<
    z.input<typeof logWeightEntrySchema>,
    unknown,
    z.output<typeof logWeightEntrySchema>
  >({
    resolver: zodResolver(logWeightEntrySchema),
    defaultValues: { date: date ?? "", weight: initialWeight ?? undefined },
  });

  useEffect(() => {
    if (date) {
      form.reset({ date, weight: initialWeight ?? undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, initialWeight]);

  function onSubmit(values: LogWeightEntryInput) {
    startTransition(async () => {
      const result = await setWeightDay(values);
      if (result?.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Vægt registreret");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!date) return;
    startTransition(async () => {
      const result = await deleteWeightDay(date);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Registrering slettet");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {date ? formatDayLabel(date) : ""}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vægt ({weightUnit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      autoFocus
                      {...field}
                      value={(field.value as string | number | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              {initialWeight != null && (
                <Button
                  type="button"
                  variant="outline"
                  className="sm:mr-auto"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Slet
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? "Gemmer..." : "Gem"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
