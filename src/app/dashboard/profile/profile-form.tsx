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
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { updateProfile } from "./actions";

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
