"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
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
import { logFoodEntrySchema, type LogFoodEntryInput } from "@/lib/validations/food";
import { logFoodEntry } from "./actions";

function toLocalDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function FoodLogForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof logFoodEntrySchema>,
    unknown,
    z.output<typeof logFoodEntrySchema>
  >({
    resolver: zodResolver(logFoodEntrySchema),
    defaultValues: {
      date: "",
      kcal: undefined,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    },
  });

  useEffect(() => {
    form.setValue("date", toLocalDateInputValue(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(values: LogFoodEntryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await logFoodEntry(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Food logged");
      form.reset({
        date: toLocalDateInputValue(new Date()),
        kcal: undefined,
        protein: undefined,
        carbs: undefined,
        fat: undefined,
      });
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    {...field}
                    value={(field.value as string | number | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
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
                <FormLabel>Carbs (g)</FormLabel>
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
                <FormLabel>Fat (g)</FormLabel>
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
        {formError && <p className="text-destructive text-sm">{formError}</p>}
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Logging..." : "Log food"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
