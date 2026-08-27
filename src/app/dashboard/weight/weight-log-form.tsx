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
import { logWeightEntrySchema, type LogWeightEntryInput } from "@/lib/validations/weight";
import { logWeightEntry } from "./actions";

function toLocalDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function WeightLogForm({ weightUnit }: { weightUnit: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof logWeightEntrySchema>,
    unknown,
    z.output<typeof logWeightEntrySchema>
  >({
    resolver: zodResolver(logWeightEntrySchema),
    defaultValues: {
      date: "",
      weight: undefined,
    },
  });

  useEffect(() => {
    form.setValue("date", toLocalDateInputValue(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(values: LogWeightEntryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await logWeightEntry(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Vægt registreret");
      form.reset({
        date: toLocalDateInputValue(new Date()),
        weight: undefined,
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
                <FormLabel>Dato</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            {isPending ? "Registrerer..." : "Registrer vægt"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
