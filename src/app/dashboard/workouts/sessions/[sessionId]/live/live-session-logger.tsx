"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ExercisePickerDialog,
  type ExerciseOption,
} from "@/components/exercise-picker-dialog";
import { cn } from "@/lib/utils";
import { DEFAULT_REST_SECONDS, type LiveSession } from "../../live-queries";
import {
  addSessionExercise,
  addSessionSet,
  discardWorkoutSession,
  finishWorkoutSession,
  removeSessionExercise,
  removeSessionSet,
  saveSessionSet,
} from "../../actions";
import { RestTimer } from "./rest-timer";

type SetRow = {
  id: string;
  setIndex: number;
  reps: string;
  weight: string;
  done: boolean;
};

type Group = {
  key: string;
  ref: LiveSession["exercises"][number]["ref"];
  exerciseId: string;
  name: string;
  muscleGroup: string;
  target: LiveSession["exercises"][number]["target"];
  last: LiveSession["exercises"][number]["last"];
  sets: SetRow[];
};

function toGroups(session: LiveSession): Group[] {
  return session.exercises.map((exercise) => ({
    key: exercise.key,
    ref: exercise.ref,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    target: exercise.target,
    last: exercise.last,
    sets: exercise.sets.map((set) => ({
      id: set.id,
      setIndex: set.setIndex,
      reps: set.reps?.toString() ?? "",
      weight: set.weight ?? "",
      done: set.done,
    })),
  }));
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function num(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMuscleGroup(value: string) {
  return value.replace(/_/g, " ");
}

export function LiveSessionLogger({
  session,
  availableExercises,
}: {
  session: LiveSession;
  availableExercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(() => toGroups(session));
  // Kept in sync so debounced saves read the latest rows without re-subscribing.
  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const [saving, setSaving] = useState(0);
  const [rest, setRest] = useState<{ seconds: number; nonce: number } | null>(
    null
  );
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exerciseOptions, setExerciseOptions] = useState(availableExercises);
  const [finishOpen, setFinishOpen] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [finishing, setFinishing] = useState(false);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  const usedIds = useMemo(
    () => new Set(groups.map((group) => group.exerciseId).filter(Boolean)),
    [groups]
  );

  function mutate(updater: (prev: Group[]) => Group[]) {
    setGroups((prev) => {
      const next = updater(prev);
      groupsRef.current = next;
      return next;
    });
  }

  async function track<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setSaving((s) => s + 1);
    try {
      const result = await fn();
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error?: unknown }).error
      ) {
        toast.error(String((result as { error?: unknown }).error));
      }
      return result;
    } catch {
      toast.error("Noget gik galt. Prøv igen.");
      return undefined;
    } finally {
      setSaving((s) => s - 1);
    }
  }

  function flushSave(setId: string, overrideDone?: boolean) {
    for (const group of groupsRef.current) {
      const row = group.sets.find((set) => set.id === setId);
      if (!row) continue;
      return track(() =>
        saveSessionSet({
          sessionId: session.id,
          setId,
          ref: group.ref,
          setIndex: row.setIndex,
          reps: num(row.reps),
          weight: num(row.weight),
          done: overrideDone ?? row.done,
        })
      );
    }
    return Promise.resolve(undefined);
  }

  function scheduleSave(setId: string) {
    const existing = timers.current.get(setId);
    if (existing) clearTimeout(existing);
    timers.current.set(
      setId,
      setTimeout(() => {
        timers.current.delete(setId);
        void flushSave(setId);
      }, 450)
    );
  }

  async function flushAllPending() {
    const ids = [...timers.current.keys()];
    for (const id of ids) {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
    }
    await Promise.all(ids.map((id) => flushSave(id)));
  }

  function updateField(
    groupKey: string,
    setId: string,
    field: "reps" | "weight",
    value: string
  ) {
    mutate((prev) =>
      prev.map((group) =>
        group.key !== groupKey
          ? group
          : {
              ...group,
              sets: group.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set
              ),
            }
      )
    );
    scheduleSave(setId);
  }

  function toggleDone(groupKey: string, setId: string) {
    const group = groups.find((item) => item.key === groupKey);
    const current = group?.sets.find((set) => set.id === setId);
    if (!group || !current) return;
    const nextDone = !current.done;

    mutate((prev) =>
      prev.map((item) =>
        item.key !== groupKey
          ? item
          : {
              ...item,
              sets: item.sets.map((set) =>
                set.id === setId ? { ...set, done: nextDone } : set
              ),
            }
      )
    );

    const pending = timers.current.get(setId);
    if (pending) {
      clearTimeout(pending);
      timers.current.delete(setId);
    }
    void flushSave(setId, nextDone);

    if (nextDone) {
      const seconds = group.target?.restSeconds ?? DEFAULT_REST_SECONDS;
      setRest((prev) => ({ seconds, nonce: (prev?.nonce ?? 0) + 1 }));
    }
  }

  async function addSet(group: Group) {
    const nextIndex =
      group.sets.reduce((max, set) => Math.max(max, set.setIndex), -1) + 1;
    const setId = crypto.randomUUID();
    mutate((prev) =>
      prev.map((item) =>
        item.key !== group.key
          ? item
          : {
              ...item,
              sets: [
                ...item.sets,
                { id: setId, setIndex: nextIndex, reps: "", weight: "", done: false },
              ],
            }
      )
    );
    await track(() =>
      addSessionSet({
        sessionId: session.id,
        setId,
        ref: group.ref,
        setIndex: nextIndex,
      })
    );
  }

  async function removeSet(group: Group, setId: string) {
    const pending = timers.current.get(setId);
    if (pending) {
      clearTimeout(pending);
      timers.current.delete(setId);
    }
    mutate((prev) =>
      prev.map((item) =>
        item.key !== group.key
          ? item
          : { ...item, sets: item.sets.filter((set) => set.id !== setId) }
      )
    );
    await track(() =>
      removeSessionSet({ sessionId: session.id, setId })
    );
  }

  async function addExercise(option: ExerciseOption) {
    if (usedIds.has(option.id)) return;
    const result = await track(() =>
      addSessionExercise({ sessionId: session.id, exerciseId: option.id })
    );
    if (!result || "error" in result || !result.setId) return;
    mutate((prev) => [
      ...prev,
      {
        key: option.id,
        ref: { kind: "exercise", exerciseId: option.id },
        exerciseId: option.id,
        name: option.name,
        muscleGroup: option.muscleGroup,
        target: null,
        last: null,
        sets: [
          { id: result.setId, setIndex: 0, reps: "", weight: "", done: false },
        ],
      },
    ]);
  }

  async function removeExercise(group: Group) {
    for (const set of group.sets) {
      const pending = timers.current.get(set.id);
      if (pending) {
        clearTimeout(pending);
        timers.current.delete(set.id);
      }
    }
    mutate((prev) => prev.filter((item) => item.key !== group.key));
    await track(() =>
      removeSessionExercise({ sessionId: session.id, ref: group.ref })
    );
  }

  async function openFinish() {
    await flushAllPending();
    setDurationInput(String(Math.max(1, Math.round(elapsed / 60))));
    setNotesInput("");
    setFinishOpen(true);
  }

  async function confirmFinish() {
    setFinishing(true);
    const result = await track(() =>
      finishWorkoutSession({
        sessionId: session.id,
        durationMinutes: num(durationInput),
        notes: notesInput.trim() ? notesInput.trim() : undefined,
      })
    );
    setFinishing(false);
    if (result && !("error" in result) && result.sessionId) {
      toast.success("Træningspas gemt");
      router.push(`/dashboard/workouts/sessions/${result.sessionId}`);
      router.refresh();
    }
  }

  async function discard() {
    const result = await track(() =>
      discardWorkoutSession({ sessionId: session.id })
    );
    if (result && !("error" in result)) {
      toast.success("Træningspas kasseret");
      router.push("/dashboard/workouts");
      router.refresh();
    }
  }

  const title = session.isFree
    ? "Frit træningspas"
    : session.programmeDayName
      ? `${session.programmeName} — ${session.programmeDayName}`
      : session.programmeName ?? "Træningspas";

  const completedSets = groups.reduce(
    (total, group) => total + group.sets.filter((set) => set.done).length,
    0
  );

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-4 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-3 backdrop-blur md:-mx-8 md:-mt-8 md:px-8">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className="font-mono">{formatClock(elapsed)}</span> ·{" "}
            {completedSets} sæt
            {saving > 0 ? (
              <>
                {" · "}
                <Loader2 className="inline size-3 animate-spin align-[-2px]" />{" "}
                gemmer
              </>
            ) : (
              " · gemt"
            )}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openFinish}>
          Afslut
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Tilføj din første øvelse for at komme i gang.
          </p>
        )}

        {groups.map((group) => (
          <Card key={group.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div className="min-w-0">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.target
                    ? `Mål: ${group.target.sets} × ${group.target.reps}${
                        group.target.weight ? ` @ ${group.target.weight}` : ""
                      }`
                    : formatMuscleGroup(group.muscleGroup)}
                </p>
                {group.last && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sidste gang:{" "}
                    {group.last.sets
                      .map(
                        (set) =>
                          `${set.reps ?? "–"}×${set.weight ?? "–"}`
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Fjern øvelse"
                    />
                  }
                >
                  <Trash2 />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fjern {group.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle registrerede sæt for denne øvelse i træningspasset
                      fjernes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annullér</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void removeExercise(group)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Fjern
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_2.25rem_2rem] items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Sæt</span>
                <span>Reps</span>
                <span>Vægt</span>
                <span className="sr-only">Færdig</span>
                <span className="sr-only">Fjern</span>
              </div>
              {group.sets.map((set, index) => {
                const lastSet = group.last?.sets[index];
                return (
                  <div
                    key={set.id}
                    className="grid grid-cols-[2rem_1fr_1fr_2.25rem_2rem] items-center gap-2"
                  >
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="h-10"
                      placeholder={
                        lastSet?.reps != null
                          ? String(lastSet.reps)
                          : group.target?.reps
                      }
                      value={set.reps}
                      onChange={(event) =>
                        updateField(group.key, set.id, "reps", event.target.value)
                      }
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      className="h-10"
                      placeholder={
                        lastSet?.weight ?? group.target?.weight ?? undefined
                      }
                      value={set.weight}
                      onChange={(event) =>
                        updateField(
                          group.key,
                          set.id,
                          "weight",
                          event.target.value
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant={set.done ? "default" : "outline"}
                      className={cn("size-9", set.done && "border-transparent")}
                      aria-pressed={set.done}
                      aria-label={set.done ? "Markér som ikke færdig" : "Markér sæt færdigt"}
                      onClick={() => toggleDone(group.key, set.id)}
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Fjern sæt"
                      onClick={() => void removeSet(group, set.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-self-start"
                onClick={() => void addSet(group)}
              >
                <Plus /> Tilføj sæt
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setPickerOpen(true)}
        >
          <Plus /> Tilføj øvelse
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-center text-muted-foreground"
              />
            }
          >
            Kassér træningspas
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kassér dette træningspas?</AlertDialogTitle>
              <AlertDialogDescription>
                Alt du har registreret i dette træningspas slettes. Denne
                handling kan ikke fortrydes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Behold</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void discard()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Kassér
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {rest && (
        <div className="sticky bottom-4 z-10 mt-4">
          <RestTimer
            key={rest.nonce}
            seconds={rest.seconds}
            onDismiss={() => setRest(null)}
          />
        </div>
      )}

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exerciseOptions}
        excludeIds={usedIds}
        onSelect={(option) => void addExercise(option)}
        onExerciseCreated={(option) =>
          setExerciseOptions((current) => [...current, option])
        }
      />

      <Sheet open={finishOpen} onOpenChange={setFinishOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl gap-4 p-6">
          <SheetHeader className="p-0">
            <SheetTitle>Afslut træningspas</SheetTitle>
            <SheetDescription>
              {completedSets} sæt registreret på {formatClock(elapsed)}.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Varighed i minutter
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={durationInput}
                onChange={(event) => setDurationInput(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Noter (valgfrit)
              <Textarea
                value={notesInput}
                onChange={(event) => setNotesInput(event.target.value)}
              />
            </label>
          </div>
          <SheetFooter className="p-0">
            <Button
              type="button"
              onClick={() => void confirmFinish()}
              disabled={finishing}
            >
              {finishing ? "Gemmer..." : "Afslut og gem"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
