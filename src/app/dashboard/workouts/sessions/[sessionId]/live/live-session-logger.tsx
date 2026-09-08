"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  Info,
  Loader2,
  Minus,
  NotebookPen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  saveSessionExerciseNote,
  saveSessionSet,
  swapSessionExercise,
} from "../../actions";
import { RestTimer } from "./rest-timer";

type SetRow = {
  id: string;
  setIndex: number;
  reps: string;
  weight: string;
  rir: string;
  done: boolean;
};

type Group = {
  key: string;
  ref: LiveSession["exercises"][number]["ref"];
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  coachNotes: string | null;
  note: string | null;
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
    equipment: exercise.equipment,
    coachNotes: exercise.coachNotes,
    note: exercise.note,
    target: exercise.target,
    last: exercise.last,
    sets: exercise.sets.map((set) => ({
      id: set.id,
      setIndex: set.setIndex,
      reps: set.reps?.toString() ?? "",
      weight: set.weight ?? "",
      rir: set.rir?.toString() ?? "",
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

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function targetLine(group: Group, position: number, total: number) {
  const prefix = `Øvelse ${position} af ${total}`;
  if (group.target) {
    const weight = group.target.weight ? ` @ ${group.target.weight}` : "";
    return `${prefix} · Mål ${group.target.sets} × ${group.target.reps}${weight}`;
  }
  return `${prefix} · ${formatMuscleGroup(group.muscleGroup)}`;
}

type SheetState = { kind: "info" | "note"; key: string } | null;

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
  const [swapForKey, setSwapForKey] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState(availableExercises);
  const [finishOpen, setFinishOpen] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [finishing, setFinishing] = useState(false);

  const [sheet, setSheet] = useState<SheetState>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [activeKey, setActiveKey] = useState<string | null>(
    () => groups[0]?.key ?? null
  );
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session.startedAt]);

  const groupKeys = groups.map((group) => group.key).join("|");

  // Highlight the exercise whose card is nearest the top of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = (entry.target as HTMLElement).dataset.groupKey;
            if (key) setActiveKey(key);
          }
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 }
    );
    for (const el of cardRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [groupKeys]);

  const usedIds = useMemo(
    () => new Set(groups.map((group) => group.exerciseId).filter(Boolean)),
    [groups]
  );

  const sheetGroup = sheet
    ? groups.find((group) => group.key === sheet.key) ?? null
    : null;
  const swapGroup = swapForKey
    ? groups.find((group) => group.key === swapForKey) ?? null
    : null;

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
          rir: num(row.rir),
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
    field: "reps" | "weight" | "rir",
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

  function fillFromLast(groupKey: string, setId: string) {
    const group = groupsRef.current.find((item) => item.key === groupKey);
    const row = group?.sets.find((set) => set.id === setId);
    if (!group || !row) return;
    const lastSet = group.last?.sets[group.sets.indexOf(row)];
    if (!lastSet || (lastSet.reps == null && lastSet.weight == null)) return;
    mutate((prev) =>
      prev.map((item) =>
        item.key !== groupKey
          ? item
          : {
              ...item,
              sets: item.sets.map((set) =>
                set.id === setId
                  ? {
                      ...set,
                      reps: lastSet.reps != null ? String(lastSet.reps) : set.reps,
                      weight: lastSet.weight ?? set.weight,
                    }
                  : set
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
                {
                  id: setId,
                  setIndex: nextIndex,
                  reps: "",
                  weight: "",
                  rir: "",
                  done: false,
                },
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

  async function removeLastSet(group: Group) {
    if (group.sets.length <= 1) return;
    const last = group.sets[group.sets.length - 1];
    const pending = timers.current.get(last.id);
    if (pending) {
      clearTimeout(pending);
      timers.current.delete(last.id);
    }
    mutate((prev) =>
      prev.map((item) =>
        item.key !== group.key
          ? item
          : { ...item, sets: item.sets.filter((set) => set.id !== last.id) }
      )
    );
    await track(() =>
      removeSessionSet({ sessionId: session.id, setId: last.id })
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
        equipment: null,
        coachNotes: null,
        note: null,
        target: null,
        last: null,
        sets: [
          {
            id: result.setId,
            setIndex: 0,
            reps: "",
            weight: "",
            rir: "",
            done: false,
          },
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
    setSheet(null);
    mutate((prev) => prev.filter((item) => item.key !== group.key));
    await track(() =>
      removeSessionExercise({ sessionId: session.id, ref: group.ref })
    );
  }

  async function swapExercise(group: Group, option: ExerciseOption) {
    setSwapForKey(null);
    const result = await track(() =>
      swapSessionExercise({
        sessionId: session.id,
        ref: group.ref,
        exerciseId: option.id,
      })
    );
    if (!result || "error" in result || !result.exercise) return;
    const ex = result.exercise;
    mutate((prev) =>
      prev.map((item) =>
        item.key !== group.key
          ? item
          : {
              ...item,
              key: ex.id,
              ref: { kind: "exercise", exerciseId: ex.id },
              exerciseId: ex.id,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              equipment: ex.equipment,
              coachNotes: ex.notes,
              target: null,
              last: null,
            }
      )
    );
    setActiveKey(ex.id);
    toast.success(`Byttet til ${ex.name}`);
  }

  async function saveNote() {
    if (!sheetGroup) return;
    setSavingNote(true);
    const trimmed = noteDraft.trim();
    const result = await track(() =>
      saveSessionExerciseNote({
        sessionId: session.id,
        ref: sheetGroup.ref,
        note: trimmed,
      })
    );
    setSavingNote(false);
    if (!result || "error" in result) return;
    mutate((prev) =>
      prev.map((item) =>
        item.key !== sheetGroup.key ? item : { ...item, note: trimmed || null }
      )
    );
    setSheet(null);
  }

  function openInfo(group: Group) {
    setSheet({ kind: "info", key: group.key });
  }

  function openNote(group: Group) {
    setNoteDraft(group.note ?? "");
    setSheet({ kind: "note", key: group.key });
  }

  function jumpTo(key: string) {
    setActiveKey(key);
    cardRefs.current.get(key)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-4 border-b border-border bg-card/95 backdrop-blur md:-mx-8 md:-mt-8">
        <div className="flex items-center gap-3 px-6 py-3 md:px-8">
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
          <Button type="button" size="lg" onClick={openFinish}>
            Afslut
          </Button>
        </div>

        {groups.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-6 pt-2 pb-3 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((group) => {
              const done = group.sets.filter((set) => set.done).length;
              const complete = done > 0 && done === group.sets.length;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => jumpTo(group.key)}
                  aria-label={`Gå til ${group.name}`}
                  aria-current={group.key === activeKey}
                  className={cn(
                    "flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-colors",
                    group.key === activeKey
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground",
                    complete && group.key !== activeKey && "text-foreground"
                  )}
                >
                  <span className="text-sm font-semibold leading-none">
                    {initials(group.name)}
                  </span>
                  <span className="text-[10px] leading-none tabular-nums">
                    {complete ? (
                      <Check className="size-3" />
                    ) : (
                      `${done}/${group.sets.length}`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Tilføj din første øvelse for at komme i gang.
          </p>
        )}

        {groups.map((group, groupIndex) => (
          <Card
            key={group.key}
            data-group-key={group.key}
            ref={(el) => {
              if (el) cardRefs.current.set(group.key, el);
              else cardRefs.current.delete(group.key);
            }}
            className="scroll-mt-32 gap-3 py-4"
          >
            <div className="px-4">
              <p className="text-lg font-semibold leading-tight">{group.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {targetLine(group, groupIndex + 1, groups.length)}
              </p>
              {group.note && (
                <p className="mt-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs text-foreground">
                  {group.note}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => openInfo(group)}
                >
                  <Info /> Info
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  onClick={() => setSwapForKey(group.key)}
                >
                  <ArrowLeftRight /> Byt
                </Button>
                <Button
                  type="button"
                  variant={group.note ? "secondary" : "outline"}
                  className="h-11 flex-1"
                  onClick={() => openNote(group)}
                >
                  <NotebookPen /> Note
                </Button>
              </div>
            </div>

            <CardContent className="grid gap-1.5 px-4">
              <div className="grid grid-cols-[1.75rem_3rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem_3rem] items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span>Sæt</span>
                <span>Tidl.</span>
                <span className="text-center">Vægt</span>
                <span className="text-center">Reps</span>
                <span className="text-center">RIR</span>
                <span className="sr-only">Færdig</span>
              </div>

              {group.sets.map((set, index) => {
                const lastSet = group.last?.sets[index];
                const hasLast =
                  lastSet && (lastSet.reps != null || lastSet.weight != null);
                const doneInput = set.done
                  ? "border-primary/40 bg-primary/10 text-foreground dark:bg-primary/15"
                  : "";
                return (
                  <div
                    key={set.id}
                    className="grid grid-cols-[1.75rem_3rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem_3rem] items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        set.done ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={!hasLast}
                      onClick={() => fillFromLast(group.key, set.id)}
                      className="flex h-12 flex-col items-start justify-center leading-none text-muted-foreground disabled:opacity-60"
                      aria-label={
                        hasLast ? "Udfyld fra sidste gang" : "Ingen tidligere data"
                      }
                    >
                      {hasLast ? (
                        <>
                          <span className="text-xs font-medium tabular-nums">
                            {lastSet?.weight ?? "–"}
                          </span>
                          <span className="text-[10px] tabular-nums">
                            ×{lastSet?.reps ?? "–"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs">–</span>
                      )}
                    </button>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      className={cn(
                        "h-12 px-1 text-center text-base tabular-nums",
                        doneInput
                      )}
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
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={cn(
                        "h-12 px-1 text-center text-base tabular-nums",
                        doneInput
                      )}
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
                      inputMode="numeric"
                      min={0}
                      max={20}
                      className={cn(
                        "h-12 px-1 text-center text-base tabular-nums",
                        doneInput
                      )}
                      placeholder="–"
                      value={set.rir}
                      onChange={(event) =>
                        updateField(group.key, set.id, "rir", event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant={set.done ? "default" : "outline"}
                      className={cn(
                        "size-11 justify-self-center",
                        set.done && "border-transparent"
                      )}
                      aria-pressed={set.done}
                      aria-label={
                        set.done
                          ? "Markér som ikke færdig"
                          : "Markér sæt færdigt"
                      }
                      onClick={() => toggleDone(group.key, set.id)}
                    >
                      <Check className="size-5" />
                    </Button>
                  </div>
                );
              })}

              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => void addSet(group)}
                >
                  <Plus /> Tilføj sæt
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  disabled={group.sets.length <= 1}
                  aria-label="Fjern sidste sæt"
                  onClick={() => void removeLastSet(group)}
                >
                  <Minus />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
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

      <ExercisePickerDialog
        open={swapGroup !== null}
        onOpenChange={(open) => {
          if (!open) setSwapForKey(null);
        }}
        exercises={exerciseOptions}
        excludeIds={usedIds}
        onSelect={(option) => {
          if (swapGroup) void swapExercise(swapGroup, option);
        }}
        onExerciseCreated={(option) =>
          setExerciseOptions((current) => [...current, option])
        }
      />

      <Sheet
        open={sheet?.kind === "info" && sheetGroup !== null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <SheetContent side="bottom" className="mx-auto max-w-2xl gap-4 p-6">
          <SheetHeader className="p-0">
            <SheetTitle>{sheetGroup?.name}</SheetTitle>
            <SheetDescription>
              {sheetGroup ? formatMuscleGroup(sheetGroup.muscleGroup) : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 text-sm">
            {sheetGroup?.target && (
              <div>
                <p className="font-medium">Mål</p>
                <p className="text-muted-foreground">
                  {sheetGroup.target.sets} × {sheetGroup.target.reps}
                  {sheetGroup.target.weight
                    ? ` @ ${sheetGroup.target.weight}`
                    : ""}
                  {sheetGroup.target.restSeconds
                    ? ` · ${sheetGroup.target.restSeconds}s hvile`
                    : ""}
                </p>
              </div>
            )}
            {sheetGroup?.equipment && (
              <div>
                <p className="font-medium">Udstyr</p>
                <p className="text-muted-foreground">{sheetGroup.equipment}</p>
              </div>
            )}
            {sheetGroup?.coachNotes ? (
              <div>
                <p className="font-medium">Udførelse</p>
                <p className="whitespace-pre-line text-muted-foreground">
                  {sheetGroup.coachNotes}
                </p>
              </div>
            ) : (
              !sheetGroup?.equipment &&
              !sheetGroup?.target && (
                <p className="text-muted-foreground">
                  Ingen ekstra info for denne øvelse endnu.
                </p>
              )
            )}
          </div>
          <SheetFooter className="p-0">
            {sheetGroup && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                    />
                  }
                >
                  <Trash2 /> Fjern øvelse fra pas
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Fjern {sheetGroup.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle registrerede sæt for denne øvelse i træningspasset
                      fjernes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annullér</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void removeExercise(sheetGroup)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Fjern
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={sheet?.kind === "note" && sheetGroup !== null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <SheetContent side="bottom" className="mx-auto max-w-2xl gap-4 p-6">
          <SheetHeader className="p-0">
            <SheetTitle>Note til {sheetGroup?.name}</SheetTitle>
            <SheetDescription>
              Vises på oversigten, når du er færdig med træningspasset.
            </SheetDescription>
          </SheetHeader>
          <Textarea
            autoFocus
            rows={4}
            placeholder="fx justér sædehøjde, albuer tættere på kroppen …"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <SheetFooter className="p-0">
            <Button
              type="button"
              onClick={() => void saveNote()}
              disabled={savingNote}
            >
              {savingNote ? "Gemmer..." : "Gem note"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
