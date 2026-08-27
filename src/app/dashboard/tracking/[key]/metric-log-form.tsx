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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  logMetricEntrySchema,
  type LogMetricEntryInput,
} from "@/lib/validations/metrics";
import { logMetricEntry } from "./actions";

function toLocalDatetimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function MetricLogForm({
  metricKey,
  unit,
}: {
  metricKey: string;
  unit: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof logMetricEntrySchema>,
    unknown,
    z.output<typeof logMetricEntrySchema>
  >({
    resolver: zodResolver(logMetricEntrySchema),
    defaultValues: {
      value: undefined,
      loggedAt: "",
      note: "",
    },
  });

  useEffect(() => {
    form.setValue("loggedAt", toLocalDatetimeInputValue(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(values: LogMetricEntryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await logMetricEntry(metricKey, values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Post registreret");
      form.reset({
        value: undefined,
        loggedAt: toLocalDatetimeInputValue(new Date()),
        note: "",
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
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Værdi ({unit})</FormLabel>
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
            name="loggedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dato &amp; tid</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (valgfrit)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formError && <p className="text-destructive text-sm">{formError}</p>}
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Registrerer..." : "Registrer post"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
