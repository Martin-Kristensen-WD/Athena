export function DeltaBadge({ delta, unit }: { delta: number; unit: string }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="text-muted-foreground text-sm">Ingen ændring</span>;
  }
  return (
    <span
      className={
        delta > 0
          ? "text-sm font-medium text-primary"
          : "text-sm font-medium text-destructive"
      }
    >
      {delta > 0 ? "+" : ""}
      {delta.toLocaleString("da-DK", { maximumFractionDigits: 1 })} {unit}
    </span>
  );
}
