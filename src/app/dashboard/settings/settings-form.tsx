"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { metricDefinitions as metricDefinitionsTable } from "@/db/schema";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { updateSettings } from "./actions";

type MetricDefinition = typeof metricDefinitionsTable.$inferSelect;

const GOAL_OPTIONS: { value: SettingsInput["goalType"]; label: string; description: string }[] = [
  { value: "lose_weight", label: "Lose weight", description: "Track progress toward a lower target weight." },
  { value: "gain_muscle", label: "Gain muscle", description: "Track strength and weight progress over time." },
  { value: "maintain", label: "Maintain", description: "Stay steady around your current weight." },
];

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
      toast.success("Settings saved");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Goal &amp; tracking</CardTitle>
        <CardDescription>
          Update your goal type and which metrics you want to track. Target
          weight and daily targets live on your{" "}
          <Link href="/dashboard/profile" className="underline underline-offset-2">
            profile
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your goal</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-3"
                    >
                      {GOAL_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-start gap-3 rounded-lg border border-border p-3 has-[[data-checked]]:border-primary"
                        >
                          <RadioGroupItem value={option.value} className="mt-1" />
                          <span>
                            <span className="block font-medium">{option.label}</span>
                            <span className="text-muted-foreground text-sm">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackedMetricKeys"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you want to track?</FormLabel>
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
                              Unit: {metric.unit}
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
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
