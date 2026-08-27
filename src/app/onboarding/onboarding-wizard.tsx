"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import type { metricDefinitions as metricDefinitionsTable } from "@/db/schema";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";
import { completeOnboarding } from "./actions";

type MetricDefinition = typeof metricDefinitionsTable.$inferSelect;

const STEPS = ["Weight", "Goal", "Tracking"] as const;

const GOAL_OPTIONS: { value: OnboardingInput["goalType"]; label: string; description: string }[] = [
  { value: "lose_weight", label: "Lose weight", description: "Track progress toward a lower target weight." },
  { value: "gain_muscle", label: "Gain muscle", description: "Track strength and weight progress over time." },
  { value: "maintain", label: "Maintain", description: "Stay steady around your current weight." },
];

export function OnboardingWizard({ metrics }: { metrics: MetricDefinition[] }) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultTracked = metrics
    .filter((m) => m.key === "weight" || m.key === "steps")
    .map((m) => m.key);

  const form = useForm<
    z.input<typeof onboardingSchema>,
    unknown,
    z.output<typeof onboardingSchema>
  >({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      startingWeight: undefined,
      weightUnit: "kg",
      goalType: "lose_weight",
      goalTargetValue: undefined,
      trackedMetricKeys: defaultTracked,
    },
  });

  async function goNext() {
    const fieldsByStep: Record<number, (keyof OnboardingInput)[]> = {
      0: ["startingWeight", "weightUnit"],
      1: ["goalType", "goalTargetValue"],
      2: ["trackedMetricKeys"],
    };
    const valid = await form.trigger(fieldsByStep[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(values: OnboardingInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await completeOnboarding(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      await update({ onboardingCompleted: true });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Welcome to Athena</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
            {step === 0 && (
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="startingWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current weight</FormLabel>
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
                <FormField
                  control={form.control}
                  name="weightUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-4"
                        >
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="kg" /> kg
                          </label>
                          <label className="flex items-center gap-2">
                            <RadioGroupItem value="lb" /> lb
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
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
                  name="goalTargetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target weight (optional)</FormLabel>
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
            )}

            {step === 2 && (
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
                                    : current.filter((k) => k !== metric.key)
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
            )}

            {formError && <p className="text-destructive text-sm">{formError}</p>}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0 || isPending}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Finishing..." : "Finish"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
