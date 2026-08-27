"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { metricDefinitions as metricDefinitionsTable } from "@/db/schema";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { updateSettings } from "./actions";

type MetricDefinition = typeof metricDefinitionsTable.$inferSelect;

export function SettingsForm({
  metrics,
  initialValues,
}: {
  metrics: MetricDefinition[];
  initialValues: SettingsInput;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof settingsSchema>,
    unknown,
    z.output<typeof settingsSchema>
  >({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialValues,
  });

  function onSubmit(values: SettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateSettings(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Indstillinger gemt");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Dashboard-kort</CardTitle>
        <CardDescription>
          Vælg hvilke ting du vil spore. Slår du en fra, forsvinder dens kort
          fra dashboardet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
            <FormField
              control={form.control}
              name="trackedMetricKeys"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hvad vil du spore?</FormLabel>
                  <div className="grid gap-3">
                    {metrics.map((metric) => {
                      const checked = field.value?.includes(metric.key);
                      return (
                        <label
                          key={metric.key}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const current = field.value ?? [];
                              field.onChange(
                                value
                                  ? [...current, metric.key]
                                  : current.filter((key) => key !== metric.key)
                              );
                            }}
                          />
                          <span>
                            <span className="block font-medium">{metric.label}</span>
                            <span className="text-muted-foreground text-sm">
                              Enhed: {metric.unit}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && <p className="text-destructive text-sm">{formError}</p>}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Gemmer..." : "Gem ændringer"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
