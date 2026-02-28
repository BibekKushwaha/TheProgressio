"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TimePickerInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  minuteStep?: number;
};

function to12HourLabel(value: string): string {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "12:00 AM";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function splitTime(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour24 = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);
  const safeHour24 = Number.isNaN(hour24) ? 0 : Math.min(23, Math.max(0, hour24));
  const safeMinute = Number.isNaN(minute) ? 0 : Math.min(59, Math.max(0, minute));
  return {
    hour12: safeHour24 % 12 === 0 ? 12 : safeHour24 % 12,
    minute: safeMinute,
    period: safeHour24 >= 12 ? "PM" : "AM",
  };
}

function mergeTo24Hour(hour12: number, minute: number, period: "AM" | "PM"): string {
  const normalizedHour12 = Math.min(12, Math.max(1, hour12));
  let hour24 = normalizedHour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(Math.min(59, Math.max(0, minute))).padStart(2, "0")}`;
}

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  minuteStep = 5,
}: TimePickerInputProps) {
  const parsed = splitTime(value);
  const minuteOptions = useMemo(() => {
    const options: number[] = [];
    const step = Math.max(1, minuteStep);
    for (let minute = 0; minute < 60; minute += step) {
      options.push(minute);
    }
    if (!options.includes(parsed.minute)) {
      options.push(parsed.minute);
      options.sort((a, b) => a - b);
    }
    return options;
  }, [minuteStep, parsed.minute]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start bg-black/20 border-white/10 text-sm text-white hover:bg-white/10 hover:text-white",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-slate-400" />
          {to12HourLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] bg-slate-950 border-white/10 text-white">
        <p className="mb-3 text-sm font-medium text-slate-300">Select time</p>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={String(parsed.hour12)}
            onValueChange={(nextHour) => {
              onChange(mergeTo24Hour(Number.parseInt(nextHour, 10), parsed.minute, parsed.period));
            }}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(parsed.minute)}
            onValueChange={(nextMinute) => {
              onChange(mergeTo24Hour(parsed.hour12, Number.parseInt(nextMinute, 10), parsed.period));
            }}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              {minuteOptions.map((minute) => (
                <SelectItem key={minute} value={String(minute)}>
                  {String(minute).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={parsed.period}
            onValueChange={(nextPeriod: "AM" | "PM") => {
              onChange(mergeTo24Hour(parsed.hour12, parsed.minute, nextPeriod));
            }}
          >
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
