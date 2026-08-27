"use client";

import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="block font-medium">Mørkt tema</span>
        <span className="text-muted-foreground block text-sm">
          Skift mellem lyst og mørkt udseende.
        </span>
      </span>
      <Switch
        checked={resolvedTheme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </label>
  );
}
