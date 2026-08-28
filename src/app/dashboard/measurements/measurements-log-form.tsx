"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEASUREMENT_TYPES, PROGRESS_PHOTO_VIEWS, type ProgressPhotoView } from "@/db/schema";
import { MEASUREMENT_LABELS, MEASUREMENT_UNIT, PHOTO_VIEW_LABELS } from "./constants";
import { logMeasurements } from "./actions";

function toLocalDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function PhotoSlot({ view }: { view: ProgressPhotoView }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <Label htmlFor={`photo_${view}`}>{PHOTO_VIEW_LABELS[view]}</Label>
      <label
        htmlFor={`photo_${view}`}
        className="flex aspect-3/4 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-muted/30 text-center text-xs text-muted-foreground"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={PHOTO_VIEW_LABELS[view]}
            className="size-full object-cover"
          />
        ) : (
          <span className="px-2">Upload billede</span>
        )}
      </label>
      <input
        id={`photo_${view}`}
        name={`photo_${view}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </div>
  );
}

export function MeasurementsLogForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await logMeasurements(formData);
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Registrering gemt");
      formRef.current?.reset();
      setResetKey((key) => key + 1);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6">
      <div className="max-w-48">
        <Label htmlFor="date">Dato</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={toLocalDateInputValue(new Date())}
          className="mt-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {MEASUREMENT_TYPES.map((type) => (
          <div key={type}>
            <Label htmlFor={type}>
              {MEASUREMENT_LABELS[type]} ({MEASUREMENT_UNIT})
            </Label>
            <Input
              id={type}
              name={type}
              type="number"
              step="0.1"
              inputMode="decimal"
              className="mt-2"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 sm:max-w-md">
        {PROGRESS_PHOTO_VIEWS.map((view) => (
          <PhotoSlot key={`${view}-${resetKey}`} view={view} />
        ))}
      </div>

      {formError && <p className="text-destructive text-sm">{formError}</p>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Gemmer..." : "Gem registrering"}
        </Button>
      </div>
    </form>
  );
}
