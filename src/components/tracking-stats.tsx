export type TrackingStat = {
  label: string;
  value: string;
  suffix?: string;
};

export function TrackingStats({ items }: { items: TrackingStat[] }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-muted-foreground text-sm">{item.label}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {item.value}
            {item.suffix && (
              <>
                {" "}
                <span className="text-muted-foreground text-base font-normal">
                  {item.suffix}
                </span>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
