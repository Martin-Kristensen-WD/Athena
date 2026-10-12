"use client";

import { useState } from "react";
import { da } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  name,
  id,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);

  return (
    <InputGroup className={cn("bg-background", className)}>
      <InputGroupInput
        type="date"
        name={name}
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                size="icon-xs"
                disabled={disabled}
                aria-label="Åbn kalender"
              />
            }
          >
            <CalendarIcon />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={da}
              autoFocus
              defaultMonth={selected}
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(formatValue(date));
                  onBlur?.();
                  setOpen(false);
                }
              }}
              formatters={{
                formatCaption: (month) =>
                  month
                    .toLocaleDateString("da-DK", {
                      month: "long",
                      year: "numeric",
                    })
                    .toUpperCase(),
              }}
              className="p-3 [--cell-size:--spacing(9)]"
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
