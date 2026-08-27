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
import { logStepsEntrySchema, type LogStepsEntryInput } from "@/lib/validations/steps";
import { logStepsEntry } from "./actions";

function toLocalDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function StepsLogForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof logStepsEntrySchema>,
    unknown,
    z.output<typeof logStepsEntrySchema>
  >({
    resolver: zodResolver(logStepsEntrySchema),
    defaultValues: {
      date: "",
      steps: undefined,
    },
  });

  useEffect(() => {
    form.setValue("date", toLocalDateInputValue(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(values: LogStepsEntryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await logStepsEntry(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Skridt registreret");
      form.reset({
        date: toLocalDateInputValue(new Date()),
        steps: undefined,
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
            name="steps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skridt</FormLabel>
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
        {formError && <p className="text-destructive text-sm">{formError}</p>}
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Registrerer..." : "Registrer skridt"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
