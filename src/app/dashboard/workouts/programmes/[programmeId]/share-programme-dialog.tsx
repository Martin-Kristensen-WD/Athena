"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  shareProgrammeSchema,
  type ShareProgrammeInput,
} from "@/lib/validations/programme-shares";
import { shareProgramme } from "../share-actions";

export function ShareProgrammeDialog({
  programmeId,
}: {
  programmeId: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ShareProgrammeInput>({
    resolver: zodResolver(shareProgrammeSchema),
    defaultValues: { email: "" },
  });

  async function handleSubmit(values: ShareProgrammeInput) {
    const result = await shareProgramme(programmeId, values);
    if (result?.error) {
      form.setError("root", { message: result.error });
      return;
    }
    toast.success("Program delt");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset({ email: "" });
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Share2 /> Del
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Del program</DialogTitle>
          <DialogDescription>
            Programmet, dets dage og øvelser kopieres til modtagerens konto,
            når de accepterer delingen.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modtagerens e-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="navn@eksempel.dk"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annullér
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Deler..." : "Del"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
