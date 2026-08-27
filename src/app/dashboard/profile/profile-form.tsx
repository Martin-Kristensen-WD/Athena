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
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weight goals</CardTitle>
            <CardDescription>
              Leave a field empty to clear it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="milestoneTargetValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next milestone weight ({weightUnit})</FormLabel>
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
                  <FormLabel>End goal weight ({weightUnit})</FormLabel>
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
            <CardTitle>Daily targets</CardTitle>
            <CardDescription>
              Shown at the top of the Food and Steps pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="dailyCalorieTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily calorie target (kcal)</FormLabel>
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
                  <FormLabel>Daily steps target</FormLabel>
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
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
