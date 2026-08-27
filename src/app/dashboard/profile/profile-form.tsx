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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { updateProfile } from "./actions";

const GOAL_OPTIONS: { value: ProfileInput["goalType"]; label: string; description: string }[] = [
  { value: "lose_weight", label: "Tab dig", description: "Følg din udvikling mod en lavere målvægt." },
  { value: "gain_muscle", label: "Byg muskler", description: "Følg din styrke og vægt over tid." },
  { value: "maintain", label: "Vedligehold", description: "Hold din vægt stabil omkring nuværende niveau." },
];

export function ProfileForm({
  initialValues,
  weightUnit,
}: {
  initialValues: ProfileInput;
  weightUnit: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<
    z.input<typeof profileSchema>,
    unknown,
    z.output<typeof profileSchema>
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  function onSubmit(values: ProfileInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Profil gemt");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dit mål</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vægtmål</CardTitle>
            <CardDescription>
              Lad et felt være tomt for at slette det.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="milestoneTargetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Næste delmål for vægt ({weightUnit})</FormLabel>
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
              name="goalTargetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slutmål for vægt ({weightUnit})</FormLabel>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daglige mål</CardTitle>
            <CardDescription>
              Vises øverst på Kost- og Skridt-siderne.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="dailyCalorieTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dagligt kaloriemål (kcal)</FormLabel>
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
            <FormField
              control={form.control}
              name="dailyStepsTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dagligt skridtmål</FormLabel>
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
          </CardContent>
        </Card>

        {formError && <p className="text-destructive text-sm">{formError}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Gemmer..." : "Gem ændringer"}
        </Button>
      </form>
    </Form>
  );
}
