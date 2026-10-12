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
  logFoodEntrySchema,
  type LogFoodEntryInput,
} from "@/lib/validations/food";
import { setFoodDay, deleteFoodDay } from "./actions";
import type { FoodDayRow } from "./food-log-list";

function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function EditFoodDayDialog({
  date,
  onOpenChange,
  initialValues,
}: {
  /** The clicked day (YYYY-MM-DD), or null while the dialog is closed. */
  date: string | null;
  onOpenChange: (open: boolean) => void;
  initialValues: FoodDayRow | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const open = date !== null;

  const form = useForm<
    z.input<typeof logFoodEntrySchema>,
    unknown,
    z.output<typeof logFoodEntrySchema>
  >({
    resolver: zodResolver(logFoodEntrySchema),
    defaultValues: {
      date: date ?? "",
      kcal: initialValues?.kcal,
      protein: initialValues?.protein,
      carbs: initialValues?.carbs,
      fat: initialValues?.fat,
    },
  });

  useEffect(() => {
    if (date) {
      form.reset({
        date,
        kcal: initialValues?.kcal,
        protein: initialValues?.protein,
        carbs: initialValues?.carbs,
        fat: initialValues?.fat,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, initialValues]);

  function onSubmit(values: LogFoodEntryInput) {
    startTransition(async () => {
      const result = await setFoodDay(values);
      if (result?.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Mad registreret");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!date) return;
    startTransition(async () => {
      const result = await deleteFoodDay(date);
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
              name="kcal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kcal</FormLabel>
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
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="protein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kulhydrater (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fedt (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={(field.value as string | number | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              {initialValues != null && (
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
