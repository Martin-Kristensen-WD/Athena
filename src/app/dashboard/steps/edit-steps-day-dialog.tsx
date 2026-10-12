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
  logStepsEntrySchema,
  type LogStepsEntryInput,
} from "@/lib/validations/steps";
import { setStepsDay, deleteStepsDay } from "./actions";

function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EditStepsDayDialog({
  date,
  onOpenChange,
  initialSteps,
}: {
  /** The clicked day (YYYY-MM-DD), or null while the dialog is closed. */
  date: string | null;
  onOpenChange: (open: boolean) => void;
  initialSteps: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const open = date !== null;

  const form = useForm<
    z.input<typeof logStepsEntrySchema>,
    unknown,
    z.output<typeof logStepsEntrySchema>
  >({
    resolver: zodResolver(logStepsEntrySchema),
    defaultValues: { date: date ?? "", steps: initialSteps ?? undefined },
  });

  useEffect(() => {
    if (date) {
      form.reset({ date, steps: initialSteps ?? undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, initialSteps]);

  function onSubmit(values: LogStepsEntryInput) {
    startTransition(async () => {
      const result = await setStepsDay(values);
      if (result?.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Skridt registreret");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!date) return;
    startTransition(async () => {
      const result = await deleteStepsDay(date);
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
              name="steps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skridt</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
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
              {initialSteps != null && (
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
