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

const MACRO_KEYS = ["protein", "carbs", "fat"];

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
              render={({ field }) => {
                const current = field.value ?? [];
                const caloriesOn = current.includes("calories");
                const macrosOn = MACRO_KEYS.every((key) => current.includes(key));

                const checkboxClass =
                  "data-checked:border-button data-checked:bg-button data-checked:text-button-foreground dark:data-checked:bg-button";

                function setKey(key: string, on: boolean) {
                  field.onChange(
                    on
                      ? [...current.filter((k) => k !== key), key]
                      : current.filter((k) => k !== key)
                  );
                }

                function setCalories(on: boolean) {
                  // Macros lives under Kalorier, so untracking Kalorier drops it too.
                  field.onChange(
                    on
                      ? [...current, "calories"]
                      : current.filter(
                          (k) => k !== "calories" && !MACRO_KEYS.includes(k)
                        )
                  );
                }

                function setMacros(on: boolean) {
                  field.onChange(
                    on
                      ? [
                          ...current.filter((k) => !MACRO_KEYS.includes(k)),
                          ...MACRO_KEYS,
                        ]
                      : current.filter((k) => !MACRO_KEYS.includes(k))
                  );
                }

                return (
                  <FormItem>
                    <FormLabel>Hvad vil du tracke?</FormLabel>
                    <div className="grid gap-3">
                      {metrics.map((metric) => {
                        const checked = current.includes(metric.key);
                        return (
                          <div
                            key={metric.key}
                            className="grid gap-3"
                          >
                            <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  if (metric.key === "calories") {
                                    setCalories(Boolean(value));
                                  } else {
                                    setKey(metric.key, Boolean(value));
                                  }
                                }}
                                className={checkboxClass}
                              />
                              <span className="flex-1">
                                <span className="block font-medium">
                                  {metric.label}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  Enhed: {metric.unit}
                                </span>
                              </span>
                            </label>

                            {metric.key === "calories" && caloriesOn && (
                              <label className="ml-6 flex items-center gap-3 rounded-lg border border-border p-3">
                                <Checkbox
                                  checked={macrosOn}
                                  onCheckedChange={(value) =>
                                    setMacros(Boolean(value))
                                  }
                                  className={checkboxClass}
                                />
                                <span className="flex-1">
                                  <span className="block font-medium">Macros</span>
                                  <span className="text-muted-foreground text-sm">
                                    Protein, kulhydrat og fedt
                                  </span>
                                </span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
